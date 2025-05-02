import { Module, forwardRef } from '@nestjs/common';
import { SshService } from './ssh.service';
import { ServersModule } from '../servers/servers.module';
import { ProxyModule } from '../proxy/proxy.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    forwardRef(() => ServersModule),
    ProxyModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [SshService],
  exports: [SshService],
})
export class SshModule {}
