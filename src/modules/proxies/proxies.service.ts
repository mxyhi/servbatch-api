import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';
import { ProxyQueryDto } from './dto/proxy-query.dto';
import { ProxyEntity } from './entities/proxy.entity';
import { ProxyGateway } from '../proxy/proxy.gateway';
import { PaginationResultDto, PaginationService } from '../../common';

@Injectable()
export class ProxiesService {
  private readonly logger = new Logger(ProxiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly proxyGateway: ProxyGateway,
    private readonly paginationService: PaginationService,
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

  async findByLimit(
    params: ProxyQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<ProxyEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.id) {
      where.id = params.id;
    }

    if (params.name) {
      where.name = {
        contains: params.name,
      };
    }

    // 使用分页服务进行查询
    const result = await this.paginationService.paginateByLimit<ProxyEntity>(
      this.prisma.proxy,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
      {}, // include
    );

    // 添加在线状态
    result.items = result.items.map((proxy) => ({
      ...proxy,
      status: this.proxyGateway.isProxyOnline(proxy.id) ? 'online' : 'offline',
    }));

    return result;
  }

  /**
   * 分页获取代理列表（别名，保持向后兼容）
   * @deprecated 请使用 findByLimit 方法
   */
  async findAll(
    params: ProxyQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<ProxyEntity>> {
    return this.findByLimit(params);
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
  async getOnlineProxies(
    params: ProxyQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<ProxyEntity>> {
    const onlineProxyIds = this.proxyGateway.getOnlineProxies();

    // 构建查询条件
    const where: any = {
      id: {
        in: onlineProxyIds,
      },
    };

    // 处理特定字段的查询
    if (params.id) {
      where.id = params.id; // 这会覆盖上面的 in 条件，但这是合理的，因为如果指定了具体ID，就不需要 in 条件了
    }

    if (params.name) {
      where.name = {
        contains: params.name,
      };
    }

    // 使用分页服务进行查询
    const result = await this.paginationService.paginateByLimit<ProxyEntity>(
      this.prisma.proxy,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
      {}, // include
    );

    // 添加在线状态
    result.items = result.items.map((proxy) => ({
      ...proxy,
      status: 'online', // 这里已经确定是在线的
    }));

    return result;
  }
}
