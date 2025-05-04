import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommandMonitorDto } from './dto/create-command-monitor.dto';
import { UpdateCommandMonitorDto } from './dto/update-command-monitor.dto';
import { CommandMonitorEntity } from './entities/command-monitor.entity';
import { CommandMonitorExecutionEntity } from './entities/command-monitor-execution.entity';
import { CommandMonitorQueryDto } from './dto/command-monitor-query.dto';
import { CommandMonitorExecutionQueryDto } from './dto/command-monitor-execution-query.dto';
import { ServersService } from '../servers/servers.service';
import { CleanupByDateDto } from './dto/cleanup-by-date.dto';
import { CleanupResultDto } from './dto/cleanup-result.dto';
import {
  PaginationResultDto,
  PaginationService,
  CleanupUtil,
  buildDateRangeFilter,
  ErrorHandler,
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

  async findByLimit(
    params: CommandMonitorQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.name) {
      where.name = {
        contains: params.name,
      };
    }

    if (params.enabled !== undefined) {
      where.enabled = params.enabled;
    }

    if (params.serverId) {
      where.serverId = params.serverId;
    }

    // 使用分页服务进行查询
    return this.paginationService.paginateByLimit<CommandMonitorEntity>(
      this.prisma.commandMonitor,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
      {}, // include
    );
  }

  /**
   * 分页获取命令监控列表（别名，保持向后兼容）
   * @deprecated 请使用 findByLimit 方法
   */
  async findAll(
    params: CommandMonitorQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorEntity>> {
    return this.findByLimit(params);
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
    params: CommandMonitorExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorExecutionEntity>> {
    // 验证监控是否存在
    await this.findOne(monitorId);

    // 构建查询条件
    const where: any = { monitorId };

    // 处理特定字段的查询
    if (params.serverId) {
      where.serverId = params.serverId;
    }

    if (params.executed !== undefined) {
      where.executed = params.executed;
    }

    // 处理日期范围查询
    if (params.startDate || params.endDate) {
      where.executedAt = buildDateRangeFilter(
        'executedAt',
        params.startDate,
        params.endDate,
      );
    }

    return this.paginationService.paginateByLimit<CommandMonitorExecutionEntity>(
      this.prisma.commandMonitorExecution,
      params,
      where, // where
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

      return CleanupUtil.cleanupByDateRange(
        this.prisma,
        'commandMonitorExecution',
        'executedAt',
        startDate,
        endDate,
        { monitorId },
        this.logger,
        `命令监控ID ${monitorId} 的执行历史记录`,
      );
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `清理命令监控ID ${monitorId} 的执行历史记录失败`,
      );

      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${err.message}`,
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
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `清理命令监控ID ${monitorId} 的执行历史记录失败`,
      );

      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${err.message}`,
      };
    }
  }

  async cleanupExecutionsByServerId(
    serverId: number,
  ): Promise<CleanupResultDto> {
    try {
      // 验证服务器是否存在
      await this.serversService.findOne(serverId);

      return CleanupUtil.cleanupByDateRange(
        this.prisma,
        'commandMonitorExecution',
        'executedAt',
        undefined,
        undefined,
        { serverId },
        this.logger,
        `服务器ID ${serverId} 的命令监控执行历史记录`,
      );
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `清理服务器ID ${serverId} 的命令监控执行历史记录失败`,
      );

      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${err.message}`,
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

  async getAllExecutions(
    params: CommandMonitorExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorExecutionEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.monitorId) {
      where.monitorId = params.monitorId;
    }

    if (params.serverId) {
      where.serverId = params.serverId;
    }

    if (params.executed !== undefined) {
      where.executed = params.executed;
    }

    // 处理日期范围查询
    if (params.startDate || params.endDate) {
      where.executedAt = buildDateRangeFilter(
        'executedAt',
        params.startDate,
        params.endDate,
      );
    }

    return this.paginationService.paginateByLimit<CommandMonitorExecutionEntity>(
      this.prisma.commandMonitorExecution,
      params,
      where, // where
      { executedAt: 'desc' }, // orderBy
    );
  }
}
