import { Module, forwardRef } from '@nestjs/common';
import { CommandMonitorsService } from './command-monitors.service';
import { CommandMonitorsController } from './command-monitors.controller';
import { CommandMonitorService } from './command-monitor.service';
import { SshModule } from '../ssh/ssh.module';
import { ServersModule } from '../servers/servers.module';
import { CommonModule } from '../../common';

@Module({
  imports: [
    forwardRef(() => SshModule),
    forwardRef(() => ServersModule),
    CommonModule,
  ],
  controllers: [CommandMonitorsController],
  providers: [CommandMonitorsService, CommandMonitorService],
  exports: [CommandMonitorsService],
})
export class CommandMonitorsModule {}
