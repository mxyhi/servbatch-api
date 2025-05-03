import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { ServerEntity } from './entities/server.entity';
import {
  ImportServersDto,
  ImportServersResultDto,
  ImportFailureServerDto,
} from './dto/import-servers.dto';
import { PaginationResultDto, PaginationService } from '../../common';
import { ServerQueryDto } from './dto/server-query.dto';

@Injectable()
export class ServersService {
  private readonly logger = new Logger(ServersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  async create(createServerDto: CreateServerDto): Promise<ServerEntity> {
    return this.prisma.server.create({
      data: createServerDto,
    });
  }

  async findAll(
    params: ServerQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<ServerEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.name) {
      where.name = {
        contains: params.name,
      };
    }

    if (params.host) {
      where.host = {
        contains: params.host,
      };
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.connectionType) {
      where.connectionType = params.connectionType;
    }

    // 使用分页服务进行查询，并指定可搜索字段
    return this.paginationService.paginate<ServerEntity>(
      this.prisma.server,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
      {}, // include
      ['name', 'host', 'username'], // 可搜索字段（用于关键字搜索）
    );
  }

  async findOne(id: number): Promise<ServerEntity> {
    const server = await this.prisma.server.findUnique({
      where: { id },
    });

    if (!server) {
      throw new NotFoundException(`服务器ID ${id} 不存在`);
    }

    return server;
  }

  async update(
    id: number,
    updateServerDto: UpdateServerDto,
  ): Promise<ServerEntity> {
    try {
      return await this.prisma.server.update({
        where: { id },
        data: updateServerDto,
      });
    } catch (error) {
      throw new NotFoundException(`服务器ID ${id} 不存在`);
    }
  }

  async remove(id: number): Promise<ServerEntity> {
    console.log(id);
    console.log(typeof id);
    try {
      return await this.prisma.server.delete({
        where: { id },
      });
    } catch (error) {
      console.log(error.message);
      throw new NotFoundException(`服务器ID ${id} 不存在`);
    }
  }

  async updateStatus(id: number, status: string): Promise<ServerEntity> {
    try {
      return await this.prisma.server.update({
        where: { id },
        data: {
          status,
          lastChecked: new Date(),
        },
      });
    } catch (error) {
      throw new NotFoundException(`服务器ID ${id} 不存在`);
    }
  }

  /**
   * 批量导入服务器
   * @param importServersDto 服务器导入数据
   * @returns 导入结果
   */
  async importServers(
    importServersDto: ImportServersDto,
  ): Promise<ImportServersResultDto> {
    const result: ImportServersResultDto = {
      successCount: 0,
      failureCount: 0,
      successServers: [],
      failureServers: [] as ImportFailureServerDto[],
    };

    // 检查是否有重复的主机和端口
    const existingServers = await this.prisma.server.findMany({
      select: {
        host: true,
        port: true,
      },
    });

    const existingHostPortMap = new Map<string, boolean>();
    existingServers.forEach((server) => {
      existingHostPortMap.set(`${server.host}:${server.port}`, true);
    });

    // 处理每个服务器
    for (const serverDto of importServersDto.servers) {
      try {
        // 检查是否已存在相同主机和端口的服务器
        const hostPortKey = `${serverDto.host}:${serverDto.port || 22}`;
        if (existingHostPortMap.has(hostPortKey)) {
          throw new ConflictException(
            `服务器 ${serverDto.host}:${serverDto.port || 22} 已存在`,
          );
        }

        // 创建服务器
        const createdServer = await this.create(serverDto);
        result.successCount++;
        result.successServers.push(createdServer);

        // 更新映射，防止同一批次中有重复的主机和端口
        existingHostPortMap.set(hostPortKey, true);

        this.logger.log(
          `成功导入服务器: ${serverDto.name} (${serverDto.host})`,
        );
      } catch (error) {
        result.failureCount++;
        result.failureServers.push({
          server: serverDto,
          reason: error.message,
        });

        this.logger.error(
          `导入服务器失败: ${serverDto.name} (${serverDto.host}) - ${error.message}`,
        );
      }
    }

    return result;
  }
}
