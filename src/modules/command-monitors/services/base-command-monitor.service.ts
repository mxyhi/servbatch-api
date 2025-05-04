import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCommandMonitorDto } from '../dto/create-command-monitor.dto';
import { UpdateCommandMonitorDto } from '../dto/update-command-monitor.dto';
import { CommandMonitorEntity } from '../entities/command-monitor.entity';
import { CommandMonitorQueryDto } from '../dto/command-monitor-query.dto';
import { ServersService } from '../../servers/servers.service';
import { PaginationResultDto, PaginationService } from '../../../common';

/**
 * 命令监控基础服务
 * 提供基本的CRUD操作
 */
@Injectable()
export class BaseCommandMonitorService {
  protected readonly logger = new Logger(BaseCommandMonitorService.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly serversService: ServersService,
    protected readonly paginationService: PaginationService,
  ) {}

  /**
   * 创建命令监控
   * @param createCommandMonitorDto 创建命令监控DTO
   * @returns 创建的命令监控实体
   */
  async create(
    createCommandMonitorDto: CreateCommandMonitorDto,
  ): Promise<CommandMonitorEntity> {
    // 验证服务器是否存在
    await this.serversService.findOne(createCommandMonitorDto.serverId);

    return this.prisma.commandMonitor.create({
      data: createCommandMonitorDto,
    });
  }

  /**
   * 分页查询命令监控
   * @param params 查询参数
   * @returns 分页结果
   */
  async findByLimit(
    params: CommandMonitorQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.name) {
      where.name = {
        contains: params.name,
      };
    }

    if (params.enabled !== undefined) {
      where.enabled = params.enabled;
    }

    if (params.serverId) {
      where.serverId = params.serverId;
    }

    // 使用分页服务进行查询
    return this.paginationService.paginateByLimit<CommandMonitorEntity, any>(
      this.prisma.commandMonitor,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
      {}, // include
    );
  }

  /**
   * 分页获取命令监控列表（别名，保持向后兼容）
   * @deprecated 请使用 findByLimit 方法
   */
  async findAll(
    params: CommandMonitorQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorEntity>> {
    return this.findByLimit(params);
  }

  /**
   * 根据ID查询命令监控
   * @param id 命令监控ID
   * @returns 命令监控实体
   */
  async findOne(id: number): Promise<CommandMonitorEntity> {
    const monitor = await this.prisma.commandMonitor.findUnique({
      where: { id },
    });

    if (!monitor) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }

    return monitor;
  }

  /**
   * 更新命令监控
   * @param id 命令监控ID
   * @param updateCommandMonitorDto 更新命令监控DTO
   * @returns 更新后的命令监控实体
   */
  async update(
    id: number,
    updateCommandMonitorDto: UpdateCommandMonitorDto,
  ): Promise<CommandMonitorEntity> {
    try {
      // 如果更新了服务器ID，验证服务器是否存在
      if (updateCommandMonitorDto.serverId) {
        await this.serversService.findOne(updateCommandMonitorDto.serverId);
      }

      return await this.prisma.commandMonitor.update({
        where: { id },
        data: updateCommandMonitorDto,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  /**
   * 删除命令监控
   * @param id 命令监控ID
   * @returns 删除的命令监控实体
   */
  async remove(id: number): Promise<CommandMonitorEntity> {
    try {
      return await this.prisma.commandMonitor.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  /**
   * 启用命令监控
   * @param id 命令监控ID
   * @returns 启用后的命令监控实体
   */
  async enable(id: number): Promise<CommandMonitorEntity> {
    try {
      return await this.prisma.commandMonitor.update({
        where: { id },
        data: { enabled: true },
      });
    } catch (error) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  /**
   * 禁用命令监控
   * @param id 命令监控ID
   * @returns 禁用后的命令监控实体
   */
  async disable(id: number): Promise<CommandMonitorEntity> {
    try {
      return await this.prisma.commandMonitor.update({
        where: { id },
        data: { enabled: false },
      });
    } catch (error) {
      throw new NotFoundException(`命令监控ID ${id} 不存在`);
    }
  }

  /**
   * 获取所有启用的命令监控
   * @returns 启用的命令监控实体列表
   */
  async getAllEnabledMonitors(): Promise<CommandMonitorEntity[]> {
    return this.prisma.commandMonitor.findMany({
      where: { enabled: true },
    });
  }
}
