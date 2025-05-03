import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskExecutionsModule } from '../task-executions/task-executions.module';
import { CommonModule } from '../../common';

@Module({
  imports: [forwardRef(() => TaskExecutionsModule), CommonModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
