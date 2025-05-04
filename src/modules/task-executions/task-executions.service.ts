import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TaskExecutionEntity } from './entities/task-execution.entity';
import { CreateTaskExecutionDto } from './dto/create-task-execution.dto';
import { CleanupByDateDto } from './dto/cleanup-by-date.dto';
import {
  CleanupByStatusDto,
  TaskExecutionStatus,
} from './dto/cleanup-by-status.dto';
import { CleanupResultDto } from './dto/cleanup-result.dto';
import { TaskExecutionQueryDto } from './dto/task-execution-query.dto';
import { TasksService } from '../tasks/tasks.service';
import { ServersService } from '../servers/servers.service';
import { QueueService } from '../queue/queue.service';
import {
  PaginationResultDto,
  PaginationParamsDto,
  PaginationService,
  CleanupUtil,
  buildDateRangeFilter,
  ErrorHandler,
} from '../../common';

@Injectable()
export class TaskExecutionsService {
  private readonly logger = new Logger(TaskExecutionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly serversService: ServersService,
    private readonly queueService: QueueService,
    private readonly paginationService: PaginationService,
  ) {}

  async create(
    createTaskExecutionDto: CreateTaskExecutionDto,
  ): Promise<{ message: string; queueId: number }> {
    // 验证任务是否存在
    await this.tasksService.findOne(createTaskExecutionDto.taskId);

    // 验证所有服务器是否存在
    for (const serverId of createTaskExecutionDto.serverIds) {
      await this.serversService.findOne(serverId);
    }

    // 将任务添加到队列
    const queueId = await this.queueService.enqueue(
      createTaskExecutionDto.taskId,
      createTaskExecutionDto.serverIds,
      createTaskExecutionDto.priority,
    );

    return {
      message: '任务已添加到队列',
      queueId,
    };
  }

  async findByLimit(
    params: TaskExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.taskId) {
      where.taskId = params.taskId;
    }

    if (params.serverId) {
      where.serverId = params.serverId;
    }

    if (params.status) {
      where.status = params.status;
    }

    // 处理日期范围查询
    if (params.startDate || params.endDate) {
      where.createdAt = buildDateRangeFilter(
        'createdAt',
        params.startDate,
        params.endDate,
      );
    }

    return this.paginationService.paginateByLimit<TaskExecutionEntity>(
      this.prisma.taskExecution,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
    );
  }

  /**
   * 分页获取任务执行记录列表（别名，保持向后兼容）
   * @deprecated 请使用 findByLimit 方法
   */
  async findAll(
    params: TaskExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.findByLimit(params);
  }

  async findOne(id: number): Promise<TaskExecutionEntity> {
    const execution = await this.prisma.taskExecution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`执行记录ID ${id} 不存在`);
    }

    return execution;
  }

  async findByTaskId(
    taskId: number,
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.paginationService.paginateByLimit<TaskExecutionEntity>(
      this.prisma.taskExecution,
      params,
      { taskId }, // where
      { createdAt: 'desc' }, // orderBy
    );
  }

  async findByServerId(
    serverId: number,
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.paginationService.paginateByLimit<TaskExecutionEntity>(
      this.prisma.taskExecution,
      params,
      { serverId }, // where
      { createdAt: 'desc' }, // orderBy
    );
  }

  async cancel(id: number): Promise<TaskExecutionEntity> {
    const execution = await this.findOne(id);

    if (execution.status !== 'queued' && execution.status !== 'running') {
      throw new Error(`无法取消状态为 ${execution.status} 的任务`);
    }

    // 如果任务在队列中，从队列中移除
    if (execution.status === 'queued') {
      // 这里需要实现队列取消逻辑
      await this.queueService.cancel(id);
    }

    // 更新任务状态
    return this.prisma.taskExecution.update({
      where: { id },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });
  }

  async remove(id: number): Promise<TaskExecutionEntity> {
    try {
      return await this.prisma.taskExecution.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`执行记录ID ${id} 不存在`);
    }
  }

  /**
   * 根据日期范围清理任务执行历史记录
   * @param cleanupDto 清理参数
   * @returns 清理结果
   */
  async cleanupByDate(cleanupDto: CleanupByDateDto): Promise<CleanupResultDto> {
    const { startDate, endDate } = cleanupDto;

    return CleanupUtil.cleanupByDateRange(
      this.prisma,
      'taskExecution',
      'createdAt',
      startDate,
      endDate,
      {},
      this.logger,
      '任务执行历史记录',
    );
  }

  /**
   * 根据状态清理任务执行历史记录
   * @param cleanupDto 清理参数
   * @returns 清理结果
   */
  async cleanupByStatus(
    cleanupDto: CleanupByStatusDto,
  ): Promise<CleanupResultDto> {
    try {
      const { statuses } = cleanupDto;

      // 执行删除操作
      const { count } = await this.prisma.taskExecution.deleteMany({
        where: {
          status: {
            in: statuses,
          },
        },
      });

      this.logger.log(
        `已清理 ${count} 条状态为 ${statuses.join(', ')} 的任务执行历史记录`,
      );

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理 ${count} 条状态为 ${statuses.join(', ')} 的任务执行历史记录`,
      };
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        '清理任务执行历史记录失败',
      );

      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${err.message}`,
      };
    }
  }

  /**
   * 清理指定任务的所有执行历史记录
   * @param taskId 任务ID
   * @returns 清理结果
   */
  async cleanupByTaskId(taskId: number): Promise<CleanupResultDto> {
    try {
      // 验证任务是否存在
      await this.tasksService.findOne(taskId);

      // 执行删除操作
      const { count } = await this.prisma.taskExecution.deleteMany({
        where: { taskId },
      });

      this.logger.log(`已清理任务ID ${taskId} 的 ${count} 条执行历史记录`);

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理任务ID ${taskId} 的 ${count} 条执行历史记录`,
      };
    } catch (error) {
      this.logger.error(
        `清理任务ID ${taskId} 的执行历史记录失败: ${error.message}`,
      );
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error.message}`,
      };
    }
  }

  /**
   * 清理指定服务器的所有执行历史记录
   * @param serverId 服务器ID
   * @returns 清理结果
   */
  async cleanupByServerId(serverId: number): Promise<CleanupResultDto> {
    try {
      // 验证服务器是否存在
      await this.serversService.findOne(serverId);

      // 执行删除操作
      const { count } = await this.prisma.taskExecution.deleteMany({
        where: { serverId },
      });

      this.logger.log(`已清理服务器ID ${serverId} 的 ${count} 条执行历史记录`);

      return {
        deletedCount: count,
        success: true,
        message: `已成功清理服务器ID ${serverId} 的 ${count} 条执行历史记录`,
      };
    } catch (error) {
      this.logger.error(
        `清理服务器ID ${serverId} 的执行历史记录失败: ${error.message}`,
      );
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error.message}`,
      };
    }
  }
}
