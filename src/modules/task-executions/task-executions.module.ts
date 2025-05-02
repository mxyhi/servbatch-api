import { Module, forwardRef } from '@nestjs/common';
import { TaskExecutionsService } from './task-executions.service';
import { TaskExecutionsController } from './task-executions.controller';
import { TasksModule } from '../tasks/tasks.module';
import { ServersModule } from '../servers/servers.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    ServersModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [TaskExecutionsController],
  providers: [TaskExecutionsService],
  exports: [TaskExecutionsService],
})
export class TaskExecutionsModule {}
