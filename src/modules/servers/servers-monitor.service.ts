import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServersService } from './servers.service';
import { SshService } from '../ssh/ssh.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServersMonitorService {
  private readonly logger = new Logger(ServersMonitorService.name);

  constructor(
    private readonly serversService: ServersService,
    private readonly sshService: SshService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkServersStatus() {
    this.logger.log('开始检查服务器状态...');

    // 获取所有服务器（不分页，获取所有记录）
    const allServers = await this.prisma.server.findMany();

    for (const server of allServers) {
      try {
        const result = await this.sshService.testConnection(server.id);

        if (result.success) {
          if (server.status !== 'online') {
            await this.serversService.updateStatus(server.id, 'online');
            this.logger.log(
              `服务器 ${server.name} (${server.host}) 状态更新为在线`,
            );
          }
        } else {
          if (server.status !== 'offline') {
            await this.serversService.updateStatus(server.id, 'offline');
            this.logger.log(
              `服务器 ${server.name} (${server.host}) 状态更新为离线`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `检查服务器 ${server.name} (${server.host}) 状态时出错: ${error.message}`,
        );

        if (server.status !== 'offline') {
          await this.serversService.updateStatus(server.id, 'offline');
          this.logger.log(
            `服务器 ${server.name} (${server.host}) 状态更新为离线`,
          );
        }
      }
    }

    this.logger.log('服务器状态检查完成');
  }
}
