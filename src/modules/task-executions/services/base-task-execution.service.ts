import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TaskExecutionEntity } from '../entities/task-execution.entity';
import { CreateTaskExecutionDto } from '../dto/create-task-execution.dto';
import { TaskExecutionQueryDto } from '../dto/task-execution-query.dto';
import { TasksService } from '../../tasks/tasks.service';
import { ServersService } from '../../servers/servers.service';
import { QueueService } from '../../queue/queue.service';
import {
  PaginationResultDto,
  PaginationParamsDto,
  PaginationService,
  buildDateRangeFilter,
  DateField,
} from '../../../common';

/**
 * 任务执行基础服务
 * 提供基本的CRUD操作
 */
@Injectable()
export class BaseTaskExecutionService {
  protected readonly logger = new Logger(BaseTaskExecutionService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tasksService: TasksService,
    protected readonly serversService: ServersService,
    protected readonly queueService: QueueService,
    protected readonly paginationService: PaginationService,
  ) {}

  /**
   * 创建任务执行记录
   * @param createTaskExecutionDto 创建任务执行DTO
   * @returns 创建结果
   */
  async create(
    createTaskExecutionDto: CreateTaskExecutionDto,
  ): Promise<{ message: string; queueId: number }> {
    const { taskId, serverIds, priority } = createTaskExecutionDto;

    // 使用事务批量验证任务和服务器是否存在
    await this.prisma.$transaction(async (prisma) => {
      // 验证任务是否存在
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true },
      });

      if (!task) {
        throw new NotFoundException(`任务ID ${taskId} 不存在`);
      }

      // 批量验证所有服务器是否存在
      if (serverIds.length > 0) {
        const foundServers = await prisma.server.findMany({
          where: { id: { in: serverIds } },
          select: { id: true },
        });

        const foundServerIds = foundServers.map((server) => server.id);
        const missingServerIds = serverIds.filter(
          (id) => !foundServerIds.includes(id),
        );

        if (missingServerIds.length > 0) {
          throw new NotFoundException(
            `以下服务器ID不存在: ${missingServerIds.join(', ')}`,
          );
        }
      }
    });

    // 将任务添加到队列
    const queueId = await this.queueService.enqueue(
      taskId,
      serverIds,
      priority,
    );

    return {
      message: '任务已添加到队列',
      queueId,
    };
  }

  /**
   * 分页查询任务执行记录
   * @param params 查询参数
   * @returns 分页结果
   */
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
        DateField.CREATED_AT,
        params.startDate,
        params.endDate,
      );
    }

    return this.paginationService.paginateByLimit<TaskExecutionEntity, any>(
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

  /**
   * 根据ID查询任务执行记录
   * @param id 任务执行记录ID
   * @returns 任务执行记录实体
   */
  async findOne(id: number): Promise<TaskExecutionEntity> {
    const execution = await this.prisma.taskExecution.findUnique({
      where: { id },
    });

    if (!execution) {
      throw new NotFoundException(`执行记录ID ${id} 不存在`);
    }

    return execution;
  }

  /**
   * 根据任务ID查询执行记录
   * @param taskId 任务ID
   * @param params 分页参数
   * @returns 分页结果
   */
  async findByTaskId(
    taskId: number,
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.paginationService.paginateByLimit<TaskExecutionEntity, any>(
      this.prisma.taskExecution,
      params,
      { taskId: { equals: taskId } }, // where
      { createdAt: 'desc' }, // orderBy
    );
  }

  /**
   * 根据服务器ID查询执行记录
   * @param serverId 服务器ID
   * @param params 分页参数
   * @returns 分页结果
   */
  async findByServerId(
    serverId: number,
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.paginationService.paginateByLimit<TaskExecutionEntity, any>(
      this.prisma.taskExecution,
      params,
      { serverId: { equals: serverId } }, // where
      { createdAt: 'desc' }, // orderBy
    );
  }

  /**
   * 取消任务执行
   * @param id 任务执行记录ID
   * @returns 更新后的任务执行记录实体
   */
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

  /**
   * 删除任务执行记录
   * @param id 任务执行记录ID
   * @returns 删除的任务执行记录实体
   */
  async remove(id: number): Promise<TaskExecutionEntity> {
    try {
      return await this.prisma.taskExecution.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`执行记录ID ${id} 不存在`);
    }
  }
}
