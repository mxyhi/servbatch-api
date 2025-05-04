import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TasksService } from '../../tasks/tasks.service';
import { QueueStats } from '../types/queue.types';
import { Task } from '@prisma/client'; // Import Task type

/**
 * Interface for cache entries, storing value and timestamp.
 * Migrated from old QueueService.
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

@Injectable()
export class QueueCacheService {
  private readonly logger = new Logger(QueueCacheService.name);

  // Cache storage
  private taskCache = new Map<number, CacheEntry<Task>>(); // Use Task type
  private queueStatsCache: CacheEntry<QueueStats> | null = null;

  // Cache Time-To-Live (TTL) in milliseconds
  private readonly cacheTTL = 30000; // 30 seconds, TODO: Make configurable via ConfigService

  constructor(
    // Inject TasksService to fetch tasks when cache misses
    private readonly tasksService: TasksService,
  ) {}

  /**
   * Retrieves task details, using cache first.
   * If cache misses or is expired, fetches from TasksService and updates cache.
   * Migrated and adapted from old QueueService.getCachedTask.
   * @param taskId The ID of the task to retrieve.
   * @returns The Task object or null if not found.
   */
  async getTask(taskId: number): Promise<Task | null> {
    const now = Date.now();
    const cachedEntry = this.taskCache.get(taskId);

    // Check if cache entry exists and is still valid
    if (cachedEntry && now - cachedEntry.timestamp < this.cacheTTL) {
      this.logger.debug(`Task cache hit for Task ID: ${taskId}`);
      return cachedEntry.value;
    }

    // Cache miss or expired, fetch from the database via TasksService
    this.logger.debug(
      `Task cache miss or expired for Task ID: ${taskId}. Fetching from TasksService.`,
    );
    try {
      // Assuming tasksService.findOne throws if not found or returns null
      const task = await this.tasksService.findOne(taskId);
      if (task) {
        // Update cache
        this.taskCache.set(taskId, { value: task, timestamp: now });
        this.logger.debug(`Task cache updated for Task ID: ${taskId}`);
        return task;
      } else {
        // Task not found in the database
        this.logger.warn(`Task not found in database for Task ID: ${taskId}`);
        // Remove potentially stale cache entry if it existed but expired
        this.taskCache.delete(taskId);
        return null; // Explicitly return null if not found
      }
    } catch (error) {
      // Handle potential errors from tasksService.findOne (e.g., NotFoundException)
      this.logger.error(
        `Error fetching task details for Task ID ${taskId}: ${error.message}`,
        error.stack,
      );
      // Remove potentially stale cache entry
      this.taskCache.delete(taskId);
      if (error instanceof NotFoundException) {
        return null; // Return null if it was specifically a NotFoundException
      }
      throw error; // Re-throw other errors
    }
  }

  /**
   * Invalidates the task cache. Can invalidate a specific task or the entire cache.
   * Migrated from old QueueService.invalidateTaskCache.
   * @param taskId Optional ID of the task cache entry to invalidate. If omitted, clears the entire task cache.
   */
  invalidateTaskCache(taskId?: number): void {
    if (taskId) {
      const deleted = this.taskCache.delete(taskId);
      if (deleted) {
        this.logger.log(`Invalidated task cache for Task ID: ${taskId}`);
      }
    } else {
      this.taskCache.clear();
      this.logger.log('Invalidated all task cache.');
    }
  }

  /**
   * Retrieves the cached queue statistics if available and not expired.
   * @returns The cached QueueStats object or null.
   */
  getQueueStats(): QueueStats | null {
    const now = Date.now();
    // Check if cache exists and is valid
    // TODO: Consider a separate, potentially shorter, TTL for stats?
    if (
      this.queueStatsCache &&
      now - this.queueStatsCache.timestamp < this.cacheTTL
    ) {
      this.logger.debug('Queue stats cache hit.');
      return this.queueStatsCache.value;
    }
    // Cache miss or expired
    this.logger.debug('Queue stats cache miss or expired.');
    this.queueStatsCache = null; // Ensure expired cache is cleared
    return null;
  }

  /**
   * Updates the queue statistics cache.
   * @param stats The new QueueStats object to cache.
   */
  setQueueStats(stats: QueueStats): void {
    this.queueStatsCache = { value: stats, timestamp: Date.now() };
    this.logger.log('Queue stats cache updated.');
  }

  /**
   * Invalidates the queue statistics cache.
   * Migrated from old QueueService.invalidateStatsCache.
   */
  invalidateStatsCache(): void {
    if (this.queueStatsCache) {
      this.queueStatsCache = null;
      this.logger.log('Invalidated queue stats cache.');
    }
  }
}
