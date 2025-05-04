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
    let cpuUsage: number | null = null;
    let memUsed: number | null = null;
    let memTotal: number | null = null;
    let memUsage: number | null = null;
    let gpuInfo: GpuUsageDto[] = [];

    try {
      // Pass the server ID (number)
      const cpuCmd = "top -bn1 | grep '^%Cpu(s)' | awk '{print $2+$4}'";
      const cpuResult = await this.sshService.executeCommand(id, cpuCmd);
      if (cpuResult.exitCode === 0 && cpuResult.stdout.trim()) {
        const usage = parseFloat(cpuResult.stdout.trim());
        cpuUsage = !isNaN(usage) ? usage : null;
        if (cpuUsage === null) {
          this.logger.warn(
            `Could not parse CPU usage from 'top' output: ${cpuResult.stdout} for server ${id}`,
          );
        }
      } else {
        this.logger.warn(
          `CPU command failed or returned empty output for server ${id}. stderr: ${cpuResult.stderr}`,
        );
      }

      // Pass the server ID (number)
      const memCmd = 'free -m';
      const memResult = await this.sshService.executeCommand(id, memCmd);
      if (memResult.exitCode === 0 && memResult.stdout.trim()) {
        const lines = memResult.stdout.trim().split('\n');
        const memLine = lines.find((line) => line.startsWith('Mem:'));
        if (memLine) {
          const parts = memLine.split(/\s+/);
          if (parts.length >= 4) {
            const total = parseInt(parts[1], 10);
            const used = parseInt(parts[2], 10);
            if (!isNaN(total) && !isNaN(used) && total > 0) {
              memTotal = total;
              memUsed = used;
              memUsage = parseFloat(((memUsed / memTotal) * 100).toFixed(1));
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

      // Pass the server ID (number)
      const checkGpuCmd = 'command -v nvidia-smi';
      const checkGpuResult = await this.sshService.executeCommand(
        id,
        checkGpuCmd,
      );

      if (checkGpuResult.exitCode === 0 && checkGpuResult.stdout.trim()) {
        // Pass the server ID (number)
        const gpuCmd =
          'nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits';
        const gpuResult = await this.sshService.executeCommand(id, gpuCmd);
        if (gpuResult.exitCode === 0 && gpuResult.stdout.trim()) {
          const lines = gpuResult.stdout.trim().split('\n');
          gpuInfo = lines
            .map((line) => {
              const [name, utilization, memUsedStr, memTotalStr, temp] = line
                .split(',')
                .map((s) => s.trim());
              const memUsedGpu = parseInt(memUsedStr, 10);
              const memTotalGpu = parseInt(memTotalStr, 10);
              const utilizationPercent = parseFloat(utilization);
              const temperatureCelsius = parseInt(temp, 10);
              let memoryUsagePercent: number | null = null;
              if (
                !isNaN(memUsedGpu) &&
                !isNaN(memTotalGpu) &&
                memTotalGpu > 0
              ) {
                memoryUsagePercent = parseFloat(
                  ((memUsedGpu / memTotalGpu) * 100).toFixed(1),
                );
              }
              return {
                name: name || null,
                utilizationPercent: !isNaN(utilizationPercent)
                  ? utilizationPercent
                  : null,
                memoryUsedMb: !isNaN(memUsedGpu) ? memUsedGpu : null,
                memoryTotalMb: !isNaN(memTotalGpu) ? memTotalGpu : null,
                memoryUsagePercent: memoryUsagePercent,
                temperatureCelsius: !isNaN(temperatureCelsius)
                  ? temperatureCelsius
                  : null,
              };
            })
            .filter((gpu) => gpu.name);
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

    const cpuData: CpuUsageDto = { usagePercent: cpuUsage };
    const memoryData: MemoryUsageDto = {
      usedMb: memUsed,
      totalMb: memTotal,
      usagePercent: memUsage,
    };

    return new GetServerResourcesDto({
      cpu: cpuData,
      memory: memoryData,
      gpu: gpuInfo.length > 0 ? gpuInfo : undefined,
      timestamp,
    });
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
