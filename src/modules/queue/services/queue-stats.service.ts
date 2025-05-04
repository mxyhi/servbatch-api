import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueCacheService } from './queue-cache.service';
import { QueueStats } from '../types/queue.types';
import { loopRun } from '../../../common/utils/loop-run.util'; // Assuming loopRun utility exists

@Injectable()
export class QueueStatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueStatsService.name);
  private readonly statsUpdateInterval = 10000; // 10 seconds, TODO: Make configurable?
  private stopStatsUpdateLoopFn: (() => void) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: QueueCacheService,
  ) {}

  async onModuleInit() {
    this.startStatsUpdateLoop();
    // Initial update on startup
    await this.updateQueueStats();
  }

  async onModuleDestroy() {
    this.stopStatsUpdateLoop();
  }

  // TODO: Implement getQueueStatus
  async getQueueStatus(): Promise<QueueStats> {
    this.logger.debug('Fetching queue status...');
    const cachedStats = this.cacheService.getQueueStats();
    if (cachedStats) {
      return cachedStats;
    }

    this.logger.log('Cache miss for queue stats, calculating fresh stats...');
    // If cache missed, calculate fresh stats immediately
    return this.calculateAndCacheStats();
  }

  // TODO: Implement updateQueueStats (called by loop)
  async updateQueueStats(): Promise<void> {
    this.logger.debug('Updating queue stats...');
    try {
      await this.calculateAndCacheStats();
      this.logger.debug('Queue stats updated successfully.');
    } catch (error) {
      this.logger.error(
        `Failed to update queue stats: ${error.message}`,
        error.stack,
      );
    }
  }

  // TODO: Implement calculateAndCacheStats
  private async calculateAndCacheStats(): Promise<QueueStats> {
    // Logic from old QueueService.updateQueueStats
    const statusCountsResult = await this.prisma.$queryRaw<
      Array<{ status: string; count: bigint }>
    >`
        SELECT status, COUNT(*) as count
        FROM queues
        GROUP BY status
      `;

    const stats: QueueStats = {
      waiting: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    statusCountsResult.forEach((row) => {
      const count = Number(row.count); // Convert BigInt to number
      switch (row.status) {
        case 'waiting':
          stats.waiting = count;
          break;
        case 'processing':
          stats.processing = count;
          break;
        case 'completed':
          stats.completed = count;
          break;
        case 'failed':
          stats.failed = count;
          break;
        case 'cancelled':
          stats.cancelled = count;
          break;
      }
    });

    this.cacheService.setQueueStats(stats);
    return stats;
  }

  // TODO: Implement startStatsUpdateLoop
  startStatsUpdateLoop(): void {
    if (this.stopStatsUpdateLoopFn) {
      this.logger.warn('Stats update loop already running.');
      return;
    }
    this.logger.log(
      `Starting queue stats update loop with interval: ${this.statsUpdateInterval}ms`,
    );
    this.stopStatsUpdateLoopFn = loopRun(() => this.updateQueueStats(), {
      interval: this.statsUpdateInterval,
      taskName: '队列统计更新',
      logger: this.logger,
      continueOnError: true,
    });
  }

  // TODO: Implement stopStatsUpdateLoop
  stopStatsUpdateLoop(): void {
    if (this.stopStatsUpdateLoopFn) {
      this.logger.log('Stopping queue stats update loop.');
      this.stopStatsUpdateLoopFn();
      this.stopStatsUpdateLoopFn = null;
    } else {
      this.logger.warn('Stats update loop is not running.');
    }
  }
}
