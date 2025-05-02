import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async updateLastSeen(proxyId: string): Promise<void> {
    try {
      // 检查代理是否存在
      const proxy = await this.prisma.proxy.findUnique({
        where: { id: proxyId },
      });

      if (proxy) {
        // 更新最后连接时间
        await this.prisma.proxy.update({
          where: { id: proxyId },
          data: {
            lastSeen: new Date(),
          },
        });
      } else {
        // 如果代理不存在，则创建一个新的代理记录
        await this.prisma.proxy.create({
          data: {
            id: proxyId,
            name: `代理 ${proxyId}`,
            lastSeen: new Date(),
          },
        });
        this.logger.log(`自动创建代理记录: ${proxyId}`);
      }
    } catch (error) {
      this.logger.error(`更新代理 ${proxyId} 最后连接时间失败: ${error.message}`);
    }
  }
}
