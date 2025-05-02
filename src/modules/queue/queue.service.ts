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

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private isProcessing = false;
  private maxConcurrentTasks = 5;
  private runningTasks = 0;

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
    return queue.id;
  }

  async cancel(queueId: number): Promise<void> {
    await this.prisma.queue.update({
      where: { id: queueId },
      data: { status: 'cancelled' },
    });
    this.logger.log(`队列任务 ${queueId} 已取消`);
  }

  @Interval(5000) // 每5秒检查一次队列
  async processQueue() {
    if (this.isProcessing || this.runningTasks >= this.maxConcurrentTasks) {
      return;
    }

    this.isProcessing = true;
    try {
      // 获取等待中的任务，按优先级和创建时间排序
      const waitingTasks = await this.prisma.queue.findMany({
        where: { status: 'waiting' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: this.maxConcurrentTasks - this.runningTasks,
      });

      if (waitingTasks.length === 0) {
        return;
      }

      this.logger.log(`开始处理 ${waitingTasks.length} 个队列任务`);

      // 处理每个任务
      for (const queueTask of waitingTasks) {
        this.runningTasks++;

        // 更新任务状态为处理中
        await this.prisma.queue.update({
          where: { id: queueTask.id },
          data: {
            status: 'processing',
            startedAt: new Date(),
          },
        });

        // 异步执行任务
        this.executeTask(
          queueTask.id,
          queueTask.taskId,
          queueTask.serverIds.split(',').map(Number),
        )
          .catch((error) => {
            this.logger.error(
              `执行任务 ${queueTask.id} 失败: ${error.message}`,
            );
          })
          .finally(() => {
            this.runningTasks--;
          });
      }
    } catch (error) {
      this.logger.error(`处理队列时出错: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeTask(
    queueId: number,
    taskId: number,
    serverIds: number[],
  ): Promise<void> {
    try {
      // 获取任务信息
      const task = await this.tasksService.findOne(taskId);

      // 为每个服务器创建执行记录并执行命令
      for (const serverId of serverIds) {
        try {
          // 创建执行记录
          const execution = await this.prisma.taskExecution.create({
            data: {
              taskId,
              serverId,
              status: 'running',
              startedAt: new Date(),
            },
          });

          // 执行命令
          const result = await this.sshService.executeCommand(
            serverId,
            task.command,
            task.timeout || undefined,
          );

          // 更新执行记录
          await this.prisma.taskExecution.update({
            where: { id: execution.id },
            data: {
              status: result.exitCode === 0 ? 'completed' : 'failed',
              output: `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
              exitCode: result.exitCode,
              completedAt: new Date(),
            },
          });
        } catch (error) {
          this.logger.error(
            `在服务器 ${serverId} 上执行任务 ${taskId} 失败: ${error.message}`,
          );

          // 创建失败的执行记录
          await this.prisma.taskExecution.create({
            data: {
              taskId,
              serverId,
              status: 'failed',
              output: error.message,
              exitCode: 1,
              startedAt: new Date(),
              completedAt: new Date(),
            },
          });
        }
      }

      // 更新队列状态
      await this.prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    } catch (error) {
      // 更新队列状态为失败
      await this.prisma.queue.update({
        where: { id: queueId },
        data: {
          status: 'failed',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  async getQueueStatus(): Promise<{
    waiting: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const counts = await Promise.all([
      this.prisma.queue.count({ where: { status: 'waiting' } }),
      this.prisma.queue.count({ where: { status: 'processing' } }),
      this.prisma.queue.count({ where: { status: 'completed' } }),
      this.prisma.queue.count({ where: { status: 'failed' } }),
      this.prisma.queue.count({ where: { status: 'cancelled' } }),
    ]);

    return {
      waiting: counts[0],
      processing: counts[1],
      completed: counts[2],
      failed: counts[3],
      cancelled: counts[4],
    };
  }
}
