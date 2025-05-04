// src/modules/servers/servers.module.ts (更新后)
import { Module, forwardRef } from '@nestjs/common';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';
import { SshModule } from '../ssh/ssh.module';
import { ServersMonitorService } from './servers-monitor.service';
import { CommonModule } from '../../common';
import { ServerInteractionController } from './server-interaction.controller'; // <-- Import Controller
import { ServerInteractionService } from './server-interaction.service'; // <-- Import Service
import { TerminalService } from './terminal.service'; // <-- Added Import
import { TerminalGateway } from './terminal.gateway'; // <-- Added Import

@Module({
  imports: [forwardRef(() => SshModule), CommonModule], // SshModule might still be needed by ServerInteractionService for non-terminal commands
  controllers: [ServersController, ServerInteractionController], // <-- Add Controller
  providers: [
    ServersService,
    ServersMonitorService,
    ServerInteractionService,
    TerminalService, // <-- Added Service
    TerminalGateway, // <-- Added Gateway
  ],
  exports: [ServersService], // ServerInteractionService is not exported as it's internal to this module
})
export class ServersModule {}
