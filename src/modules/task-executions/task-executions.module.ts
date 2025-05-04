import { Module, forwardRef } from '@nestjs/common';
import { TaskExecutionsService } from './services/task-executions.service';
import { BaseTaskExecutionService } from './services/base-task-execution.service';
import { CleanupService } from './services/cleanup.service';
import { TaskExecutionsController } from './task-executions.controller';
import { TasksModule } from '../tasks/tasks.module';
import { ServersModule } from '../servers/servers.module';
import { QueueModule } from '../queue/queue.module';
import { CommonModule } from '../../common';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    ServersModule,
    forwardRef(() => QueueModule),
    CommonModule,
  ],
  controllers: [TaskExecutionsController],
  providers: [BaseTaskExecutionService, CleanupService, TaskExecutionsService],
  exports: [TaskExecutionsService],
})
export class TaskExecutionsModule {}
