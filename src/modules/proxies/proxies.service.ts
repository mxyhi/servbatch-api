import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';
import { ProxyEntity } from './entities/proxy.entity';
import { ProxyGateway } from '../proxy/proxy.gateway';

@Injectable()
export class ProxiesService {
  private readonly logger = new Logger(ProxiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly proxyGateway: ProxyGateway,
  ) {}

  async create(createProxyDto: CreateProxyDto): Promise<ProxyEntity> {
    // 检查ID是否已存在
    const existingProxy = await this.prisma.proxy.findUnique({
      where: { id: createProxyDto.id },
    });

    if (existingProxy) {
      throw new ConflictException(`代理ID ${createProxyDto.id} 已存在`);
    }

    return this.prisma.proxy.create({
      data: createProxyDto,
    });
  }

  async findAll(): Promise<ProxyEntity[]> {
    const proxies = await this.prisma.proxy.findMany();

    // 添加在线状态
    return proxies.map((proxy) => ({
      ...proxy,
      status: this.proxyGateway.isProxyOnline(proxy.id) ? 'online' : 'offline',
    }));
  }

  async findOne(id: string): Promise<ProxyEntity> {
    const proxy = await this.prisma.proxy.findUnique({
      where: { id },
    });

    if (!proxy) {
      throw new NotFoundException(`代理ID ${id} 不存在`);
    }

    // 添加在线状态
    return {
      ...proxy,
      status: this.proxyGateway.isProxyOnline(id) ? 'online' : 'offline',
    };
  }

  async update(
    id: string,
    updateProxyDto: UpdateProxyDto,
  ): Promise<ProxyEntity> {
    try {
      return await this.prisma.proxy.update({
        where: { id },
        data: updateProxyDto,
      });
    } catch (error) {
      throw new NotFoundException(`代理ID ${id} 不存在`);
    }
  }

  async remove(id: string): Promise<ProxyEntity> {
    try {
      return await this.prisma.proxy.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`代理ID ${id} 不存在`);
    }
  }

  async updateLastSeen(id: string): Promise<ProxyEntity> {
    try {
      return await this.prisma.proxy.update({
        where: { id },
        data: {
          lastSeen: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(`更新代理 ${id} 最后连接时间失败: ${error.message}`);
      // 如果代理不存在，则创建一个新的代理记录
      return await this.prisma.proxy.create({
        data: {
          id,
          name: `代理 ${id}`,
          lastSeen: new Date(),
        },
      });
    }
  }

  // 获取所有在线代理
  async getOnlineProxies(): Promise<ProxyEntity[]> {
    const onlineProxyIds = this.proxyGateway.getOnlineProxies();
    const proxies = await this.prisma.proxy.findMany({
      where: {
        id: {
          in: onlineProxyIds,
        },
      },
    });

    // 添加在线状态
    return proxies.map((proxy) => ({
      ...proxy,
      status: 'online',
    }));
  }
}
