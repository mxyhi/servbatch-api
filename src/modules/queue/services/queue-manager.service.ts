import { Injectable, Logger, OnModuleInit } from '@nestjs/common'; // Add OnModuleInit
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueCacheService } from './queue-cache.service'; // Add QueueCacheService import

@Injectable()
export class QueueManagerService implements OnModuleInit {
  // Implement OnModuleInit
  private readonly logger = new Logger(QueueManagerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: QueueCacheService, // Inject QueueCacheService
  ) {}

  async onModuleInit() {
    // Call resetProcessingTasks on initialization
    await this.resetProcessingTasks();
  }

  /**
   * Adds a task to the queue.
   */
  async enqueue(
    taskId: number,
    serverIds: number[],
    priority: number = 0,
  ): Promise<number> {
    const queue = await this.prisma.queue.create({
      data: {
        taskId,
        serverIds: serverIds.join(','),
        priority,
        status: 'waiting',
      },
    });

    this.logger.log(`Task ${taskId} enqueued with Queue ID: ${queue.id}`);
    this.cacheService.invalidateStatsCache(); // Invalidate cache
    return queue.id;
  }

  /**
   * Cancels a task in the queue.
   */
  async cancel(queueId: number): Promise<void> {
    await this.prisma.queue.update({
      where: { id: queueId },
      data: { status: 'cancelled' },
    });
    this.logger.log(`Queue task ${queueId} cancelled`);
    this.cacheService.invalidateStatsCache(); // Invalidate cache
  }

  /**
   * Updates the status of a specific queue item.
   */
  async updateQueueStatus(
    queueId: number,
    status: string,
    completedAt?: Date,
  ): Promise<void> {
    const data: any = { status };
    if (status === 'completed' || status === 'failed') {
      data.completedAt = completedAt || new Date();
    }
    if (status === 'processing') {
      data.startedAt = new Date(); // Set startedAt when status becomes processing
    }

    await this.prisma.queue.update({
      where: { id: queueId },
      data,
    });
    this.logger.debug(`Queue task ${queueId} status updated to ${status}`);
    this.cacheService.invalidateStatsCache(); // Invalidate cache
  }

  /**
   * Marks a batch of tasks as 'processing'.
   */
  async markTasksAsProcessing(queueIds: number[]): Promise<void> {
    if (queueIds.length === 0) return;
    await this.prisma.queue.updateMany({
      where: { id: { in: queueIds } },
      data: {
        status: 'processing',
        startedAt: new Date(),
      },
    });
    this.logger.log(
      `Marked ${queueIds.length} tasks as processing: [${queueIds.join(', ')}]`,
    );
    // No need to invalidate stats cache here as processing count is handled by QueueStatsService loop
  }

  /**
   * Resets tasks that were stuck in 'processing' state on startup.
   */
  async resetProcessingTasks(): Promise<void> {
    const result = await this.prisma.queue.updateMany({
      where: { status: 'processing' },
      data: { status: 'waiting', startedAt: null }, // Reset status and startedAt
    });
    if (result.count > 0) {
      this.logger.log(
        `Reset ${result.count} tasks from 'processing' to 'waiting' state.`,
      );
      this.cacheService.invalidateStatsCache(); // Invalidate cache as counts changed
    }
  }
}
