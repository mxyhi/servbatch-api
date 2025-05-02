import { Module, forwardRef } from '@nestjs/common';
import { QueueService } from './queue.service';
import { SshModule } from '../ssh/ssh.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    forwardRef(() => SshModule),
    forwardRef(() => TasksModule),
  ],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
