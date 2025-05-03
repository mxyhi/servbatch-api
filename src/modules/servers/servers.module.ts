import { Module, forwardRef } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { SshModule } from '../ssh/ssh.module';
import { ServersMonitorService } from './servers-monitor.service';
import { CommonModule } from '../../common';

@Module({
  imports: [forwardRef(() => SshModule), CommonModule],
  controllers: [ServersController],
  providers: [ServersService, ServersMonitorService],
  exports: [ServersService],
})
export class ServersModule {}
