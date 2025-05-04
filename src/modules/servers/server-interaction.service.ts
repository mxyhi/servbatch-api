// src/modules/servers/server-interaction.service.ts (再次修正)
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadGatewayException,
} from '@nestjs/common';
import { ServersService } from './servers.service';
import { SshService } from '../ssh/ssh.service';
import { GetServerDetailsDto } from './dto/get-server-details.dto';
import {
  GetServerResourcesDto,
  CpuUsageDto,
  MemoryUsageDto,
  GpuUsageDto,
  GpuMemoryUsageDto, // 导入嵌套的 GPU 内存 DTO
} from './dto/get-server-resources.dto';
import { ExecuteCommandDto } from './dto/execute-command.dto';
import { ExecuteCommandResponseDto } from './dto/execute-command-response.dto';
import { ServerEntity } from './entities/server.entity';
import { CommandResult } from '../../common/types/command-result.type';

@Injectable()
export class ServerInteractionService {
  private readonly logger = new Logger(ServerInteractionService.name);

  constructor(
    private readonly serversService: ServersService,
    private readonly sshService: SshService,
  ) {}

  /**
   * 获取服务器详细信息，包括启动时间和运行时间
   * @param id 服务器 ID
   * @returns GetServerDetailsDto
   */
  async getServerDetails(id: number): Promise<GetServerDetailsDto> {
    // First, ensure the server exists and get its entity
    const server: ServerEntity = await this.findServerOrFail(id);

    let bootTime: string | null = null;
    let uptime: string | null = null;

    try {
      // Pass the server ID (number) to sshService.executeCommand
      const bootTimeResult = await this.sshService.executeCommand(id, 'who -b');
      if (bootTimeResult.exitCode === 0 && bootTimeResult.stdout.trim()) {
        const match = bootTimeResult.stdout.match(
          /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/,
        );
        if (match && match[1]) {
          try {
            const date = new Date(match[1]);
            if (!isNaN(date.getTime())) {
              bootTime = date.toISOString();
            } else {
              this.logger.warn(
                `Parsed date string is invalid: ${match[1]} for server ${id}`,
              );
            }
          } catch (dateError) {
            this.logger.warn(
              `Failed to parse boot time date string: ${match[1]} for server ${id}. Error: ${dateError.message}`,
            );
          }
        } else {
          this.logger.warn(
            `Could not parse boot time from 'who -b' output: ${bootTimeResult.stdout} for server ${id}`,
          );
        }
      } else {
        this.logger.warn(
          `'who -b' command failed or returned empty output for server ${id}. stderr: ${bootTimeResult.stderr}`,
        );
      }

      // Pass the server ID (number) to sshService.executeCommand
      const uptimeResult = await this.sshService.executeCommand(id, 'uptime');
      if (uptimeResult.exitCode === 0 && uptimeResult.stdout.trim()) {
        const upMatch = uptimeResult.stdout.match(/up\s+(.*?),\s+\d+\s+user/);
        uptime = upMatch
          ? `up ${upMatch[1].trim().replace(/\s+/g, ' ')}`
          : uptimeResult.stdout.trim();
      } else {
        this.logger.warn(
          `'uptime' command failed or returned empty output for server ${id}. stderr: ${uptimeResult.stderr}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error fetching details via SSH for server ${id}: ${error.message}`,
        error.stack,
      );
      this.handleSshError(error, id, 'details');
    }

    // Use the fetched ServerEntity to construct the DTO
    const detailsDto = new GetServerDetailsDto({
      ...server,
      bootTime,
      uptime,
    });

    return detailsDto;
  }

  /**
   * 获取服务器资源使用情况 (CPU, Memory, GPU)
   * @param id 服务器 ID
   * @returns GetServerResourcesDto
   */
  async getServerResources(id: number): Promise<GetServerResourcesDto> {
    // Ensure server exists before proceeding
    await this.findServerOrFail(id);
    const timestamp = new Date().toISOString();
    let cpuData: CpuUsageDto = { usage: 0, cores: 0, loadAverage: [0, 0, 0] };
    let memoryData: MemoryUsageDto = { total: 0, used: 0, free: 0, usage: 0 };
    let gpuData: GpuUsageDto[] = [];

    try {
      // --- CPU ---
      // Usage
      const cpuUsageCmd = "top -bn1 | grep '^%Cpu(s)' | awk '{print $2+$4}'";
      const cpuUsageResult = await this.sshService.executeCommand(
        id,
        cpuUsageCmd,
      );
      if (cpuUsageResult.exitCode === 0 && cpuUsageResult.stdout.trim()) {
        const usage = parseFloat(cpuUsageResult.stdout.trim());
        cpuData.usage = !isNaN(usage) ? usage : 0;
      } else {
        this.logger.warn(
          `CPU usage command failed or returned empty output for server ${id}. stderr: ${cpuUsageResult.stderr}`,
        );
      }

      // Cores
      const cpuCoresCmd = 'nproc';
      const cpuCoresResult = await this.sshService.executeCommand(
        id,
        cpuCoresCmd,
      );
      if (cpuCoresResult.exitCode === 0 && cpuCoresResult.stdout.trim()) {
        const cores = parseInt(cpuCoresResult.stdout.trim(), 10);
        cpuData.cores = !isNaN(cores) ? cores : 0;
      } else {
        this.logger.warn(
          `CPU cores command failed or returned empty output for server ${id}. stderr: ${cpuCoresResult.stderr}`,
        );
      }

      // Load Average
      const cpuLoadCmd = 'uptime';
      const cpuLoadResult = await this.sshService.executeCommand(
        id,
        cpuLoadCmd,
      );
      if (cpuLoadResult.exitCode === 0 && cpuLoadResult.stdout.trim()) {
        const loadMatch = cpuLoadResult.stdout.match(
          /load average:\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/,
        );
        if (loadMatch && loadMatch.length === 4) {
          cpuData.loadAverage = [
            parseFloat(loadMatch[1]),
            parseFloat(loadMatch[2]),
            parseFloat(loadMatch[3]),
          ].map((load) => (!isNaN(load) ? load : 0));
        } else {
          this.logger.warn(
            `Could not parse load average from 'uptime' output: ${cpuLoadResult.stdout} for server ${id}`,
          );
        }
      } else {
        this.logger.warn(
          `CPU load command failed or returned empty output for server ${id}. stderr: ${cpuLoadResult.stderr}`,
        );
      }

      // --- Memory ---
      const memCmd = 'free -m';
      const memResult = await this.sshService.executeCommand(id, memCmd);
      if (memResult.exitCode === 0 && memResult.stdout.trim()) {
        const lines = memResult.stdout.trim().split('\n');
        const memLine = lines.find((line) => line.startsWith('Mem:'));
        if (memLine) {
          const parts = memLine.split(/\s+/);
          // Expected format: Mem: total used free shared buff/cache available
          if (parts.length >= 4) {
            const total = parseInt(parts[1], 10);
            const used = parseInt(parts[2], 10);
            const free = parseInt(parts[3], 10); // Get the 'free' value
            if (!isNaN(total) && !isNaN(used) && !isNaN(free) && total > 0) {
              memoryData.total = total;
              memoryData.used = used;
              memoryData.free = free;
              memoryData.usage = parseFloat(((used / total) * 100).toFixed(1));
            } else {
              this.logger.warn(
                `Could not parse memory values from 'free -m' output: ${memLine} for server ${id}`,
              );
            }
          } else {
            this.logger.warn(
              `Unexpected format in 'free -m' Mem line: ${memLine} for server ${id}`,
            );
          }
        } else {
          this.logger.warn(
            `Could not find 'Mem:' line in 'free -m' output for server ${id}`,
          );
        }
      } else {
        this.logger.warn(
          `Memory command failed or returned empty output for server ${id}. stderr: ${memResult.stderr}`,
        );
      }

      // --- GPU ---
      const checkGpuCmd = 'command -v nvidia-smi';
      const checkGpuResult = await this.sshService.executeCommand(
        id,
        checkGpuCmd,
      );

      if (checkGpuResult.exitCode === 0 && checkGpuResult.stdout.trim()) {
        const gpuCmd =
          'nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits'; // Added index
        const gpuResult = await this.sshService.executeCommand(id, gpuCmd);
        if (gpuResult.exitCode === 0 && gpuResult.stdout.trim()) {
          const lines = gpuResult.stdout.trim().split('\n');
          gpuData = lines
            .map((line) => {
              const [
                indexStr,
                name,
                utilization,
                memUsedStr,
                memTotalStr,
                temp,
              ] = line.split(',').map((s) => s.trim());

              const index = parseInt(indexStr, 10);
              const usage = parseFloat(utilization);
              const temperature = parseInt(temp, 10);
              const memTotalGpu = parseInt(memTotalStr, 10);
              const memUsedGpu = parseInt(memUsedStr, 10);

              let memoryUsage: GpuMemoryUsageDto = {
                total: 0,
                used: 0,
                free: 0,
                usage: 0,
              };

              if (
                !isNaN(memTotalGpu) &&
                !isNaN(memUsedGpu) &&
                memTotalGpu > 0
              ) {
                const memFreeGpu = memTotalGpu - memUsedGpu;
                const memUsagePercent = parseFloat(
                  ((memUsedGpu / memTotalGpu) * 100).toFixed(1),
                );
                memoryUsage = {
                  total: memTotalGpu,
                  used: memUsedGpu,
                  free: memFreeGpu,
                  usage: !isNaN(memUsagePercent) ? memUsagePercent : 0,
                };
              } else {
                this.logger.warn(
                  `Could not parse GPU memory values for GPU index ${indexStr} on server ${id}: total=${memTotalStr}, used=${memUsedStr}`,
                );
              }

              const gpu: GpuUsageDto = {
                index: !isNaN(index) ? index : -1, // Use -1 or similar for invalid index
                name: name || 'Unknown GPU',
                usage: !isNaN(usage) ? usage : 0,
                memory: memoryUsage,
                temperature: !isNaN(temperature) ? temperature : 0,
              };
              // Filter out GPUs with invalid index or missing name
              return gpu.index !== -1 && gpu.name !== 'Unknown GPU'
                ? gpu
                : null;
            })
            .filter((gpu): gpu is GpuUsageDto => gpu !== null); // Type guard to filter out nulls
        } else {
          this.logger.warn(
            `GPU command 'nvidia-smi' failed or returned empty output for server ${id}. stderr: ${gpuResult.stderr}`,
          );
        }
      } else {
        this.logger.log(
          `'nvidia-smi' command not found on server ${id}. Skipping GPU info.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error fetching resources via SSH for server ${id}: ${error.message}`,
        error.stack,
      );
      this.handleSshError(error, id, 'resources');
    }

    // Return the data conforming to the updated DTO structure
    // Note: We are returning a plain object matching the DTO structure,
    // not necessarily an instance of the DTO class itself unless needed for validation/serialization.
    return {
      cpu: cpuData,
      memory: memoryData,
      gpu: gpuData, // Ensure gpu is always an array, even if empty
      timestamp,
    };
  }

  /**
   * 在服务器上执行命令
   * @param id 服务器 ID
   * @param executeCommandDto 命令和超时时间
   * @returns ExecuteCommandResponseDto
   */
  async executeCommand(
    id: number,
    executeCommandDto: ExecuteCommandDto,
  ): Promise<ExecuteCommandResponseDto> {
    // Ensure server exists first
    await this.findServerOrFail(id);
    const { command, timeout } = executeCommandDto;

    try {
      // Pass the server ID (number)
      const result: CommandResult = await this.sshService.executeCommand(
        id,
        command,
        timeout,
      );
      return new ExecuteCommandResponseDto({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      });
    } catch (error) {
      this.logger.error(
        `Error executing command on server ${id}: ${error.message}`,
        error.stack,
      );
      this.handleSshError(error, id, 'command execution');
      throw new InternalServerErrorException(
        `An unexpected error occurred during command execution on server ${id}.`,
      );
    }
  }

  /**
   * 查找服务器实体，如果不存在则抛出 NotFoundException
   * @param id 服务器 ID
   * @returns ServerEntity
   */
  private async findServerOrFail(id: number): Promise<ServerEntity> {
    const serverEntity = await this.serversService.findOne(id);
    if (!serverEntity) {
      throw new NotFoundException(`Server with ID ${id} not found.`);
    }
    return serverEntity;
  }

  /**
   * Helper function to handle common SSH errors
   */
  private handleSshError(error: any, serverId: number, context: string): never {
    if (error.message.includes('timed out')) {
      throw new BadGatewayException(
        `SSH connection or command execution timed out while fetching ${context} for server ${serverId}.`,
      );
    } else if (error.message.includes('Authentication failed')) {
      throw new BadGatewayException(
        `SSH authentication failed for server ${serverId} while fetching ${context}. Check credentials.`,
      );
    } else if (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('EHOSTUNREACH')
    ) {
      throw new BadGatewayException(
        `Could not connect to server ${serverId} while fetching ${context}. Check host, port, and network connectivity.`,
      );
    } else if (error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException(
      `Failed to fetch ${context} from server ${serverId} via SSH: ${error.message}`,
    );
  }
}
