import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CommandMonitorExecutionEntity } from '../entities/command-monitor-execution.entity';
import { CommandMonitorExecutionQueryDto } from '../dto/command-monitor-execution-query.dto';
import { CleanupByDateDto } from '../dto/cleanup-by-date.dto';
import { CleanupResultDto } from '../dto/cleanup-result.dto';
import {
  PaginationResultDto,
  PaginationService,
  CleanupUtil,
  buildDateRangeFilter,
  ErrorHandler,
  DateField,
} from '../../../common';
import { BaseCommandMonitorService } from './base-command-monitor.service';
import { ServersService } from '../../servers/servers.service';

/**
 * 命令监控执行记录服务
 * 提供执行记录的管理功能
 */
@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
    private readonly baseService: BaseCommandMonitorService,
    private readonly serversService: ServersService,
  ) {}

  /**
   * 获取特定监控的执行记录
   * @param monitorId 监控ID
   * @param params 查询参数
   * @returns 分页结果
   */
  async getExecutions(
    monitorId: number,
    params: CommandMonitorExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorExecutionEntity>> {
    // 验证监控是否存在
    await this.baseService.findOne(monitorId);

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
        DateField.EXECUTED_AT,
        params.startDate,
        params.endDate,
      );
    }

    return this.paginationService.paginateByLimit<CommandMonitorExecutionEntity, any>(
      this.prisma.commandMonitorExecution,
      params,
      where, // where
      { executedAt: 'desc' }, // orderBy
    );
  }

  /**
   * 根据日期清理执行记录
   * @param monitorId 监控ID
   * @param cleanupDto 清理参数
   * @returns 清理结果
   */
  async cleanupExecutionsByDate(
    monitorId: number,
    cleanupDto: CleanupByDateDto,
  ): Promise<CleanupResultDto> {
    try {
      // 验证监控是否存在
      await this.baseService.findOne(monitorId);

      const { startDate, endDate } = cleanupDto;

      return CleanupUtil.cleanupByDateRange(
        this.prisma,
        'commandMonitorExecution',
        DateField.EXECUTED_AT,
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

  /**
   * 清理特定监控的所有执行记录
   * @param monitorId 监控ID
   * @returns 清理结果
   */
  async cleanupExecutionsByMonitorId(
    monitorId: number,
  ): Promise<CleanupResultDto> {
    try {
      // 验证监控是否存在
      await this.baseService.findOne(monitorId);

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

  /**
   * 清理特定服务器的所有执行记录
   * @param serverId 服务器ID
   * @returns 清理结果
   */
  async cleanupExecutionsByServerId(
    serverId: number,
  ): Promise<CleanupResultDto> {
    try {
      // 验证服务器是否存在
      await this.serversService.findOne(serverId);

      return CleanupUtil.cleanupByDateRange(
        this.prisma,
        'commandMonitorExecution',
        DateField.EXECUTED_AT,
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

  /**
   * 记录执行结果
   * @param monitorId 监控ID
   * @param serverId 服务器ID
   * @param checkOutput 检查输出
   * @param checkExitCode 检查退出码
   * @param executed 是否执行
   * @param executeOutput 执行输出
   * @param executeExitCode 执行退出码
   * @returns 执行记录实体
   */
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

  /**
   * 获取所有执行记录
   * @param params 查询参数
   * @returns 分页结果
   */
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
        DateField.EXECUTED_AT,
        params.startDate,
        params.endDate,
      );
    }

    return this.paginationService.paginateByLimit<CommandMonitorExecutionEntity, any>(
      this.prisma.commandMonitorExecution,
      params,
      where, // where
      { executedAt: 'desc' }, // orderBy
    );
  }
}
