import { Module } from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { ProxiesController } from './proxies.controller';
import { ProxyModule } from '../proxy/proxy.module';
import { ProxiesMonitorService } from './proxies-monitor.service';
import { CommonModule } from '../../common';

@Module({
  imports: [ProxyModule, CommonModule],
  controllers: [ProxiesController],
  providers: [ProxiesService, ProxiesMonitorService],
  exports: [ProxiesService],
})
export class ProxiesModule {}
