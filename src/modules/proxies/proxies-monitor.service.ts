import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProxiesService } from './proxies.service';
import { ProxyGateway } from '../proxy/proxy.gateway';

@Injectable()
export class ProxiesMonitorService {
  private readonly logger = new Logger(ProxiesMonitorService.name);

  constructor(
    private readonly proxiesService: ProxiesService,
    private readonly proxyGateway: ProxyGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkProxiesStatus() {
    try {
      const result = await this.proxiesService.findAll();
      const proxyItems = result.items;

      for (const proxy of proxyItems) {
        const isOnline = this.proxyGateway.isProxyOnline(proxy.id);
        const currentStatus = isOnline ? 'online' : 'offline';

        if (proxy.status !== currentStatus) {
          this.logger.log(
            `代理 ${proxy.name} (${proxy.id}) 状态更新为 ${currentStatus}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`检查代理状态时出错: ${error.message}`);
    }
  }
}
