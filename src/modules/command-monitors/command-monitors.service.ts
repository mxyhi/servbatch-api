import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommandMonitorDto } from './dto/create-command-monitor.dto';
import { UpdateCommandMonitorDto } from './dto/update-command-monitor.dto';
import { CommandMonitorEntity } from './entities/command-monitor.entity';
import { CommandMonitorExecutionEntity } from './entities/command-monitor-execution.entity';
import { ServersService } from '../servers/servers.service';
import { CleanupByDateDto } from './dto/cleanup-by-date.dto';
import { CleanupResultDto } from './dto/cleanup-result.dto';
import {
  PaginationResultDto,
  PaginationParamsDto,
  PaginationService,
} from '../../common';

@Injectable()
export class CommandMonitorsService {
  private readonly logger = new Logger(CommandMonitorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly serversService: ServersService,
    private readonly paginationService: PaginationService,
  ) {}

  async create(
    createCommandMonitorDto: CreateCommandMonitorDto,
  ): Promise<CommandMonitorEntity> {
    // 验证服务器是否存在
    await this.serversService.findOne(createCommandMonitorDto.serverId);

    return this.prisma.commandMonitor.create({
      data: createCommandMonitorDto,
    });
  }

  async findAll(): Promise<CommandMonitorEntity[]> {
    return this.prisma.commandMonitor.findMany();
  }

  async findOne(id: number): Promise<CommandMonitorEntity> {
    const monitor = await this.prisma.commandMonitor.findUnique({
      where: { id },
    });

    if (!monitor) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }

    return monitor;
  }

  async update(
    id: number,
    updateCommandMonitorDto: UpdateCommandMonitorDto,
  ): Promise<CommandMonitorEntity> {
    try {
      // 如果更新了服务器ID，验证服务器是否存在
      if (updateCommandMonitorDto.serverId) {
        await this.serversService.findOne(updateCommandMonitorDto.serverId);
      }

      return await this.prisma.commandMonitor.update({
        where: { id },
        data: updateCommandMonitorDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  async remove(id: number): Promise<CommandMonitorEntity> {
    try {
      return await this.prisma.commandMonitor.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  async enable(id: number): Promise<CommandMonitorEntity> {
    try {
      return await this.prisma.commandMonitor.update({
        where: { id },
        data: { enabled: true },
      });
    } catch (error) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  async disable(id: number): Promise<CommandMonitorEntity> {
    try {
      return await this.prisma.commandMonitor.update({
        where: { id },
        data: { enabled: false },
      });
    } catch (error) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  async getExecutions(
    monitorId: number,
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorExecutionEntity>> {
    // 验证监控是否存在
    await this.findOne(monitorId);

    return this.paginationService.paginate<CommandMonitorExecutionEntity>(
      this.prisma.commandMonitorExecution,
      params,
      { monitorId }, // where
      { executedAt: 'desc' }, // orderBy
    );
  }

  async cleanupExecutionsByDate(
    monitorId: number,
    cleanupDto: CleanupByDateDto,
  ): Promise<CleanupResultDto> {
    try {
      // 验证监控是否存在
      await this.findOne(monitorId);

      const { startDate, endDate } = cleanupDto;
      const where: any = { monitorId };

      // 构建日期条件
      if (startDate || endDate) {
        where.executedAt = {};
        if (startDate) {
          where.executedAt.gte = startDate;
        }
        if (endDate) {
          where.executedAt.lte = endDate;
        }
      }

      // 执行删除操作
      const { count } = await this.prisma.commandMonitorExecution.deleteMany({
        where,
      });

      this.logger.log(
        `已清理命令监控ID ${monitorId} 的 ${count} 条执行历史记录`,
      );

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理命令监控ID ${monitorId} 的 ${count} 条执行历史记录`,
      };
    } catch (error) {
      this.logger.error(
        `清理命令监控ID ${monitorId} 的执行历史记录失败: ${error.message}`,
      );
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error.message}`,
      };
    }
  }

  async cleanupExecutionsByMonitorId(
    monitorId: number,
  ): Promise<CleanupResultDto> {
    try {
      // 验证监控是否存在
      await this.findOne(monitorId);

      // 执行删除操作
      const { count } = await this.prisma.commandMonitorExecution.deleteMany({
        where: { monitorId },
      });

      this.logger.log(
        `已清理命令监控ID ${monitorId} 的 ${count} 条执行历史记录`,
      );

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理命令监控ID ${monitorId} 的 ${count} 条执行历史记录`,
      };
    } catch (error) {
      this.logger.error(
        `清理命令监控ID ${monitorId} 的执行历史记录失败: ${error.message}`,
      );
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error.message}`,
      };
    }
  }

  async cleanupExecutionsByServerId(
    serverId: number,
  ): Promise<CleanupResultDto> {
    try {
      // 验证服务器是否存在
      await this.serversService.findOne(serverId);

      // 执行删除操作
      const { count } = await this.prisma.commandMonitorExecution.deleteMany({
        where: { serverId },
      });

      this.logger.log(
        `已清理服务器ID ${serverId} 的 ${count} 条命令监控执行历史记录`,
      );

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理服务器ID ${serverId} 的 ${count} 条命令监控执行历史记录`,
      };
    } catch (error) {
      this.logger.error(
        `清理服务器ID ${serverId} 的命令监控执行历史记录失败: ${error.message}`,
      );
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error.message}`,
      };
    }
  }

  async getAllEnabledMonitors(): Promise<CommandMonitorEntity[]> {
    return this.prisma.commandMonitor.findMany({
      where: { enabled: true },
    });
  }

  async recordExecution(
    monitorId: number,
    serverId: number,
    checkOutput: string,
    checkExitCode: number,
    executed: boolean,
    executeOutput?: string,
    executeExitCode?: number,
  ): Promise<CommandMonitorExecutionEntity> {
    return this.prisma.commandMonitorExecution.create({
      data: {
        monitorId,
        serverId,
        checkOutput,
        checkExitCode,
        executed,
        executeOutput,
        executeExitCode,
      },
    });
  }
}
