import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Interval } from '@nestjs/schedule';
import { SshService } from '../ssh/ssh.service';
import { TasksService } from '../tasks/tasks.service';
import { QueueStats } from './types/queue.types';

// 缓存条目接口
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private isProcessing = false;
  private maxConcurrentTasks = 10; // 增加并发任务数
  private runningTasks = 0;
  private processingTaskIds = new Set<number>(); // 跟踪正在处理的任务ID

  // 缓存实现
  private taskCache = new Map<number, CacheEntry<any>>(); // 任务缓存
  private queueStatsCache: CacheEntry<QueueStats> | null = null; // 队列状态缓存
  private readonly cacheTTL = 30000; // 缓存有效期，30秒
  private readonly statsUpdateInterval = 10000; // 统计信息更新间隔，10秒
  private lastStatsUpdate = 0; // 上次统计更新时间

  constructor(
    private readonly prisma: PrismaService,
    private readonly sshService: SshService,
    private readonly tasksService: TasksService,
  ) {}

  async onModuleInit() {
    // 初始化时，将所有running状态的任务重置为waiting
    await this.prisma.queue.updateMany({
      where: { status: 'processing' },
      data: { status: 'waiting' },
    });

    // 定期更新队列统计信息
    setInterval(() => this.updateQueueStats(), this.statsUpdateInterval);
  }

  async onModuleDestroy() {
    // 关闭所有SSH连接
    await this.sshService.closeAllConnections();
  }

  async enqueue(
    taskId: number,
    serverIds: number[],
    priority = 0,
  ): Promise<number> {
    // 创建队列记录
    const queue = await this.prisma.queue.create({
      data: {
        taskId,
        serverIds: serverIds.join(','),
        priority,
        status: 'waiting',
      },
    });

    this.logger.log(`任务 ${taskId} 已添加到队列，队列ID: ${queue.id}`);

    // 清除队列统计缓存以确保数据准确性
    this.invalidateStatsCache();

    return queue.id;
  }

  async cancel(queueId: number): Promise<void> {
    await this.prisma.queue.update({
      where: { id: queueId },
      data: { status: 'cancelled' },
    });
    this.logger.log(`队列任务 ${queueId} 已取消`);

    // 清除队列统计缓存
    this.invalidateStatsCache();
  }

  /**
   * 处理队列任务
   * 定期检查并启动等待中的任务
   */
  @Interval(3000) // 减少检查间隔，提高响应性
  async processQueue() {
    // 检查资源可用性
    if (!this.checkResourceAvailability()) {
      return;
    }

    this.isProcessing = true;
    try {
      // 计算可用槽位并获取等待任务
      const availableSlots = this.calculateAvailableSlots();
      if (availableSlots <= 0) {
        return;
      }

      // 获取等待中的任务
      const waitingTasks = await this.fetchWaitingTasks(availableSlots);
      if (waitingTasks.length === 0) {
        return;
      }

      // 处理获取到的任务
      await this.processBatchTasks(waitingTasks);

      // 更新队列统计信息
      this.invalidateStatsCache();
    } catch (error) {
      this.logger.error(`处理队列时出错: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 检查资源可用性
   * @returns 是否有可用资源
   */
  private checkResourceAvailability(): boolean {
    // 如果已经在处理或没有可用的并发槽，则退出
    return !(this.isProcessing || this.runningTasks >= this.maxConcurrentTasks);
  }

  /**
   * 计算可用的任务槽位
   * @returns 可用的槽位数量
   */
  private calculateAvailableSlots(): number {
    return this.maxConcurrentTasks - this.runningTasks;
  }

  /**
   * 获取等待中的任务
   * @param availableSlots 可用的槽位数量
   * @returns 等待中的任务列表
   */
  private async fetchWaitingTasks(availableSlots: number) {
    return this.prisma.queue.findMany({
      where: { status: 'waiting' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: availableSlots,
    });
  }

  /**
   * 处理一批等待中的任务
   * @param waitingTasks 等待中的任务列表
   */
  private async processBatchTasks(waitingTasks: any[]) {
    this.logger.log(`开始处理 ${waitingTasks.length} 个队列任务`);

    // 批量更新所有任务状态为处理中
    await this.markTasksAsProcessing(waitingTasks);

    // 创建并行处理任务的promises数组
    const taskPromises = this.createTaskPromises(waitingTasks);

    // 让任务异步执行，但不等待它们完成
    this.startAsyncTasks(taskPromises);
  }

  /**
   * 将任务标记为处理中
   * @param waitingTasks 等待中的任务列表
   */
  private async markTasksAsProcessing(waitingTasks: any[]) {
    const taskIds = waitingTasks.map((task) => task.id);
    await this.prisma.queue.updateMany({
      where: { id: { in: taskIds } },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });
  }

  /**
   * 创建任务执行Promise
   * @param waitingTasks 等待中的任务列表
   * @returns Promise数组
   */
  private createTaskPromises(waitingTasks: any[]) {
    return waitingTasks.map((queueTask) => {
      this.runningTasks++;
      this.processingTaskIds.add(queueTask.id);

      return this.executeTask(
        queueTask.id,
        queueTask.taskId,
        queueTask.serverIds.split(',').map(Number),
      )
        .catch((error) => {
          this.logger.error(`执行任务 ${queueTask.id} 失败: ${error.message}`);
        })
        .finally(() => {
          this.runningTasks--;
          this.processingTaskIds.delete(queueTask.id);
        });
    });
  }

  /**
   * 启动异步任务但不等待完成
   * @param taskPromises 任务Promise数组
   */
  private startAsyncTasks(taskPromises: Promise<void>[]) {
    for (const promise of taskPromises) {
      promise.catch(() => {}); // 避免未捕获的promise拒绝
    }
  }

  /**
   * 执行任务的主方法
   * 协调整个任务执行流程
   *
   * @param queueId 队列ID
   * @param taskId 任务ID
   * @param serverIds 服务器ID列表
   */
  private async executeTask(
    queueId: number,
    taskId: number,
    serverIds: number[],
  ): Promise<void> {
    try {
      // 从缓存获取任务信息
      const task = await this.getCachedTask(taskId);

      // 为所有服务器创建执行记录
      const executions = await this.createExecutionRecords(taskId, serverIds);

      // 并行执行所有服务器上的命令
      const executionResults = await this.executeCommandsOnServers(
        executions,
        serverIds,
        task,
      );

      // 处理执行结果并更新执行记录
      await this.processExecutionResults(executionResults, executions);

      // 更新队列状态为已完成
      await this.updateQueueStatus(queueId, 'completed');
    } catch (error) {
      // 更新队列状态为失败
      await this.updateQueueStatus(queueId, 'failed');

      // 错误处理和日志记录
      this.logger.error(
        `执行任务失败 (队列ID: ${queueId}, 任务ID: ${taskId}): ${error.message}`,
        error.stack,
      );

      throw error;
    }
  }

  /**
   * 创建任务执行记录
   *
   * @param taskId 任务ID
   * @param serverIds 服务器ID列表
   * @returns 创建的执行记录列表
   */
  private async createExecutionRecords(taskId: number, serverIds: number[]) {
    return this.prisma.$transaction(
      serverIds.map((serverId) =>
        this.prisma.taskExecution.create({
          data: {
            taskId,
            serverId,
            status: 'running',
            startedAt: new Date(),
          },
        }),
      ),
    );
  }

  /**
   * 在所有服务器上执行命令
   *
   * @param executions 执行记录列表
   * @param serverIds 服务器ID列表
   * @param task 任务信息
   * @returns 命令执行结果
   */
  private async executeCommandsOnServers(
    executions: any[],
    serverIds: number[],
    task: any,
  ) {
    return Promise.allSettled(
      executions.map(async (execution, index) => {
        const serverId = serverIds[index];
        try {
          // 执行命令
          const result = await this.sshService.executeCommand(
            serverId,
            task.command,
            task.timeout || undefined,
          );

          // 返回成功的结果
          return {
            execution,
            result,
            success: true,
          };
        } catch (error) {
          // 返回失败的结果
          return {
            execution,
            error,
            success: false,
          };
        }
      }),
    );
  }

  /**
   * 处理执行结果并更新执行记录
   *
   * @param executionResults 执行结果
   * @param executions 执行记录列表
   */
  private async processExecutionResults(
    executionResults: PromiseSettledResult<any>[],
    executions: any[],
  ) {
    const updatePromises = executionResults.map(async (settled) => {
      if (settled.status === 'fulfilled') {
        const { execution, result, success } = settled.value;

        if (success && result) {
          // 更新成功的执行记录
          return this.updateSuccessfulExecution(execution, result);
        }
      }

      // 处理失败的情况
      return this.updateFailedExecution(settled, executions, executionResults);
    });

    // 等待所有更新完成
    await Promise.all(updatePromises);
  }

  /**
   * 更新成功执行的记录
   *
   * @param execution 执行记录
   * @param result 执行结果
   */
  private updateSuccessfulExecution(execution: any, result: any) {
    return this.prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: result.exitCode === 0 ? 'completed' : 'failed',
        output: `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        exitCode: result.exitCode,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 更新失败执行的记录
   *
   * @param settled 执行结果
   * @param executions 执行记录列表
   * @param executionResults 所有执行结果
   */
  private updateFailedExecution(
    settled: PromiseSettledResult<any>,
    executions: any[],
    executionResults: PromiseSettledResult<any>[],
  ) {
    const execution =
      settled.status === 'fulfilled'
        ? settled.value.execution
        : executions[executionResults.findIndex((r) => r === settled)];

    const error =
      settled.status === 'fulfilled' ? settled.value.error : settled.reason;

    return this.prisma.taskExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        output: error.message || '执行失败',
        exitCode: 1,
        completedAt: new Date(),
      },
    });
  }

  /**
   * 更新队列状态
   *
   * @param queueId 队列ID
   * @param status 状态
   */
  private async updateQueueStatus(
    queueId: number,
    status: string,
  ): Promise<void> {
    await this.prisma.queue.update({
      where: { id: queueId },
      data: {
        status,
        completedAt: new Date(),
      },
    });

    // 清除队列统计缓存
    this.invalidateStatsCache();
  }

  /**
   * 获取缓存的任务信息
   */
  private async getCachedTask(taskId: number): Promise<any> {
    const now = Date.now();
    const cachedTask = this.taskCache.get(taskId);

    // 如果缓存有效，则直接返回
    if (cachedTask && now - cachedTask.timestamp < this.cacheTTL) {
      return cachedTask.value;
    }

    // 从数据库获取任务信息
    const task = await this.tasksService.findOne(taskId);

    // 更新缓存
    this.taskCache.set(taskId, {
      value: task,
      timestamp: now,
    });

    return task;
  }

  /**
   * 使队列统计缓存失效
   */
  private invalidateStatsCache(): void {
    this.queueStatsCache = null;
  }

  /**
   * 更新队列统计信息缓存
   */
  private async updateQueueStats(): Promise<void> {
    const now = Date.now();

    // 如果最后更新时间距现在不到更新间隔，则跳过
    if (now - this.lastStatsUpdate < this.statsUpdateInterval) {
      return;
    }

    this.lastStatsUpdate = now;

    try {
      // 使用一次查询获取所有状态的计数
      const statusCounts = await this.prisma.$queryRaw`
        SELECT status, COUNT(*) as count
        FROM queues
        GROUP BY status
      `;

      // 初始化计数对象
      const stats: QueueStats = {
        waiting: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      };

      // 填充计数
      for (const row of statusCounts as any[]) {
        if (stats.hasOwnProperty(row.status)) {
          stats[row.status as keyof QueueStats] = Number(row.count);
        }
      }

      // 更新缓存
      this.queueStatsCache = {
        value: stats,
        timestamp: now,
      };
    } catch (error) {
      this.logger.error(`更新队列统计信息失败: ${error.message}`);
    }
  }

  /**
   * 获取队列状态统计
   */
  async getQueueStatus(): Promise<QueueStats> {
    const now = Date.now();

    // 如果缓存有效，直接返回缓存值
    if (
      this.queueStatsCache &&
      now - this.queueStatsCache.timestamp < this.cacheTTL
    ) {
      return this.queueStatsCache.value;
    }

    // 如果缓存无效但统计信息将很快更新，则触发立即更新
    if (now - this.lastStatsUpdate > this.statsUpdateInterval / 2) {
      await this.updateQueueStats();

      // 如果此时已有缓存，返回缓存值
      if (this.queueStatsCache) {
        return this.queueStatsCache.value;
      }
    }

    // 仍然需要查询数据库
    const counts = await Promise.all([
      this.prisma.queue.count({ where: { status: 'waiting' } }),
      this.prisma.queue.count({ where: { status: 'processing' } }),
      this.prisma.queue.count({ where: { status: 'completed' } }),
      this.prisma.queue.count({ where: { status: 'failed' } }),
      this.prisma.queue.count({ where: { status: 'cancelled' } }),
    ]);

    const stats = {
      waiting: counts[0],
      processing: counts[1],
      completed: counts[2],
      failed: counts[3],
      cancelled: counts[4],
    };

    // 更新缓存
    this.queueStatsCache = {
      value: stats,
      timestamp: now,
    };

    return stats;
  }

  /**
   * 获取正在执行的任务列表
   */
  getRunningTaskIds(): number[] {
    return Array.from(this.processingTaskIds);
  }

  /**
   * 清除任务缓存
   */
  invalidateTaskCache(taskId?: number): void {
    if (taskId !== undefined) {
      this.taskCache.delete(taskId);
    } else {
      this.taskCache.clear();
    }
  }
}
