import { Module, forwardRef } from '@nestjs/common';
import { SshService } from './ssh.service';
import { SshConnectionService } from './services/ssh-connection.service';
import { SshCommandService } from './services/ssh-command.service';
import { ServersModule } from '../servers/servers.module';
import { ProxyModule } from '../proxy/proxy.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    forwardRef(() => ServersModule),
    ProxyModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [SshService, SshConnectionService, SshCommandService],
  exports: [SshService],
})
export class SshModule {}
