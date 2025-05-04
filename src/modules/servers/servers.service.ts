import { Injectable, Logger, ConflictException } from '@nestjs/common';
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
import { BaseService } from '../../common/services/base.service';
import {
  ErrorHandler,
  ErrorContext,
} from '../../common/utils/error-handler.util';

@Injectable()
export class ServersService extends BaseService<
  ServerEntity,
  CreateServerDto,
  UpdateServerDto,
  ServerQueryDto
> {
  protected readonly logger = new Logger(ServersService.name);
  protected readonly modelName = '服务器';

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly paginationService: PaginationService,
  ) {
    super(prisma, paginationService);
  }

  /**
   * 获取Prisma模型
   */
  protected getModel() {
    return this.prisma.server;
  }

  /**
   * 构建查询条件
   * @param params 查询参数
   * @returns 查询条件
   */
  protected buildWhereClause(params: ServerQueryDto): any {
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

    return where;
  }

  /**
   * 更新服务器状态
   * @param id 服务器ID
   * @param status 状态
   * @returns 更新后的服务器
   */
  async updateStatus(id: number, status: string): Promise<ServerEntity> {
    try {
      // 先检查服务器是否存在
      await this.findOne(id);

      return await this.prisma.server.update({
        where: { id },
        data: {
          status,
          lastChecked: new Date(),
        },
      });
    } catch (error) {
      const errorContext: ErrorContext = {
        operation: 'updateStatus',
        entity: this.modelName,
        entityId: id,
        additionalInfo: { status },
      };

      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `更新${this.modelName}状态失败`,
        errorContext,
      );
      throw err;
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

    try {
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

          // 使用ErrorHandler记录错误
          const errorContext: ErrorContext = {
            operation: 'importServer',
            entity: this.modelName,
            additionalInfo: {
              host: serverDto.host,
              port: serverDto.port || 22,
            },
          };

          ErrorHandler.handleError(
            this.logger,
            error,
            `导入服务器失败: ${serverDto.name} (${serverDto.host})`,
            errorContext,
          );
        }
      }

      return result;
    } catch (error) {
      const errorContext: ErrorContext = {
        operation: 'importServers',
        entity: this.modelName,
      };

      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `批量导入${this.modelName}失败`,
        errorContext,
      );
      throw err;
    }
  }
}
