import { Module } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';
import { ProxyModule } from '../proxy/proxy.module';
import { ProxiesMonitorService } from './proxies-monitor.service';

@Module({
  imports: [ProxyModule],
  controllers: [ProxiesController],
  providers: [ProxiesService, ProxiesMonitorService],
  exports: [ProxiesService],
})
export class ProxiesModule {}
