import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // Import ScheduleModule
import { SshModule } from '../ssh/ssh.module';
import { TasksModule } from '../tasks/tasks.module';
import { PrismaModule } from '../../prisma/prisma.module'; // Import PrismaModule if not already globally available

// Import new services
import { QueueManagerService } from './services/queue-manager.service';
import { QueueProcessorService } from './services/queue-processor.service';
import { TaskExecutorService } from './services/task-executor.service';
import { QueueCacheService } from './services/queue-cache.service';
import { QueueStatsService } from './services/queue-stats.service';

// Remove old service import
// import { QueueService } from './queue.service';

@Module({
  imports: [
    PrismaModule, // Ensure PrismaService is available
    ScheduleModule.forRoot(), // Add ScheduleModule for @Interval/SchedulerRegistry
    forwardRef(() => SshModule),
    forwardRef(() => TasksModule),
  ],
  providers: [
    // Add new services
    QueueManagerService,
    QueueProcessorService,
    TaskExecutorService,
    QueueCacheService,
    QueueStatsService,
    // Remove old service: QueueService
  ],
  exports: [
    // Export services needed by other modules (e.g., controllers)
    QueueManagerService, // For enqueue, cancel
    QueueStatsService, // For getQueueStatus
    // QueueProcessorService, // Likely internal
    // TaskExecutorService,   // Likely internal
    // QueueCacheService,     // Likely internal
  ],
})
export class QueueModule {}
