import { Injectable, Logger } from '@nestjs/common';
import { Interval, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueManagerService } from './queue-manager.service';
import { TaskExecutorService } from './task-executor.service';
import { QueueCacheService } from './queue-cache.service'; // Keep cache service for potential future use or config
import { Queue } from '@prisma/client'; // Import Queue type

@Injectable()
export class QueueProcessorService {
  private readonly logger = new Logger(QueueProcessorService.name);
  private isProcessing = false;
  private maxConcurrentTasks = 10; // TODO: Make configurable via ConfigService
  private runningTasks = 0;
  // processingTaskIds removed, TaskExecutor should manage its own state

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueManager: QueueManagerService,
    private readonly taskExecutor: TaskExecutorService,
    // private readonly cacheService: QueueCacheService, // Not directly used in processing logic now
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Main loop to process the queue, triggered by interval.
   */
  @Interval(3000) // TODO: Make interval configurable via ConfigService
  async processQueueLoop(): Promise<void> {
    if (!this.checkResourceAvailability()) {
      // this.logger.debug('Processing skipped: Not available.');
      return;
    }

    this.isProcessing = true;
    this.logger.debug('Starting queue processing cycle.');
    try {
      const availableSlots = this.calculateAvailableSlots();
      if (availableSlots <= 0) {
        this.logger.debug('No available slots.');
        return;
      }

      const waitingTasks = await this.fetchWaitingTasks(availableSlots);
      if (waitingTasks.length === 0) {
        // this.logger.debug('No waiting tasks found.');
        return;
      }

      this.logger.log(`Found ${waitingTasks.length} tasks to process.`);
      await this.processBatchTasks(waitingTasks);

      // Stats cache invalidation is handled by QueueStatsService loop and QueueManagerService actions
    } catch (error) {
      this.logger.error(
        `Error during queue processing: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isProcessing = false;
      // this.logger.debug('Finished queue processing cycle.'); // Can be noisy
    }
  }

  /**
   * Manually trigger the queue processing.
   */
  async triggerProcessing(): Promise<void> {
    this.logger.log('Manual processing trigger invoked.');
    // Avoid running concurrently if already processing
    if (!this.isProcessing) {
      await this.processQueueLoop();
    } else {
      this.logger.warn(
        'Processing is already running, manual trigger skipped.',
      );
    }
  }

  /**
   * Checks if resources are available to process more tasks.
   * Migrated from old QueueService.
   */
  private checkResourceAvailability(): boolean {
    // If already processing or no available concurrent slots, exit
    return !(this.isProcessing || this.runningTasks >= this.maxConcurrentTasks);
  }

  /**
   * Calculates the number of available concurrent task slots.
   * Migrated from old QueueService.
   */
  private calculateAvailableSlots(): number {
    return this.maxConcurrentTasks - this.runningTasks;
  }

  /**
   * Fetches waiting tasks from the database.
   * Migrated from old QueueService.
   */
  private async fetchWaitingTasks(limit: number): Promise<Queue[]> {
    return this.prisma.queue.findMany({
      where: { status: 'waiting' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });
  }

  /**
   * Processes a batch of fetched waiting tasks.
   * Migrated from old QueueService.
   */
  private async processBatchTasks(tasks: Queue[]): Promise<void> {
    this.logger.log(`Processing batch of ${tasks.length} tasks.`);
    const taskIds = tasks.map((task) => task.id);

    // Mark tasks as processing in the database via QueueManagerService
    await this.queueManager.markTasksAsProcessing(taskIds);

    // Create and start execution promises
    const taskPromises = this.createTaskPromises(tasks);
    this.startAsyncTasks(taskPromises);
  }

  /**
   * Creates promises for executing each task in the batch.
   * Migrated from old QueueService.
   */
  private createTaskPromises(tasks: Queue[]): Promise<void>[] {
    return tasks.map((queueTask) => {
      this.incrementRunningTasks(); // Increment counter before starting

      return this.taskExecutor
        .executeTask(
          queueTask.id,
          queueTask.taskId,
          queueTask.serverIds.split(',').map(Number),
        )
        .catch((error) => {
          // Error should be logged within executeTask, but log context here too
          this.logger.error(
            `Task execution promise failed unexpectedly for Queue ID ${queueTask.id}: ${error.message}`,
          );
          // Ensure status is updated to failed even if executeTask fails before updating status itself
          // Use return to ensure the promise chain continues correctly
          return this.queueManager.updateQueueStatus(queueTask.id, 'failed');
        })
        .finally(() => {
          this.decrementRunningTasks(); // Decrement counter when finished (success or fail)
        });
    });
  }

  /**
   * Starts asynchronous task execution without waiting for completion.
   * Migrated from old QueueService.
   */
  private startAsyncTasks(promises: Promise<void>[]): void {
    this.logger.debug(`Starting ${promises.length} async task executions.`);
    // Fire and forget, error handling is within the promise chain created by createTaskPromises
    for (const promise of promises) {
      promise.catch(() => {
        // Prevent unhandled promise rejections at this top level.
        // Actual error handling happens in the .catch() within createTaskPromises.
      });
    }
  }

  // --- Helper methods for managing running task count ---
  // These might be replaced by event listeners from TaskExecutorService later

  /** @internal Used by createTaskPromises */
  private incrementRunningTasks() {
    this.runningTasks++;
    this.logger.debug(
      `Running tasks incremented: ${this.runningTasks}/${this.maxConcurrentTasks}`,
    );
  }

  /** @internal Used by createTaskPromises */
  private decrementRunningTasks() {
    // Ensure runningTasks doesn't go below zero
    this.runningTasks = Math.max(0, this.runningTasks - 1);
    this.logger.debug(
      `Running tasks decremented: ${this.runningTasks}/${this.maxConcurrentTasks}`,
    );
  }
}
