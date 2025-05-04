import {
  Controller,
  Post,
  Body,
  HttpStatus,
  applyDecorators,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import { ServerEntity } from './entities/server.entity';
import { ServersService } from './servers.service';
import { ServerQueryDto } from './dto/server-query.dto';
import { SshService } from '../ssh/ssh.service';
import {
  ImportServersDto,
  ImportServersResultDto,
} from './dto/import-servers.dto';
import { BaseController } from '../../common/controllers/base.controller';

// 为导入服务器创建自定义装饰器
function ImportServersDecorators() {
  return applyDecorators(
    ApiOperation({ summary: '批量导入服务器' }),
    ApiBody({ type: ImportServersDto }),
    ApiResponse({
      status: HttpStatus.OK,
      description: '批量导入结果',
      type: ImportServersResultDto,
    }),
  );
}

// 为测试连接创建自定义装饰器
function TestConnectionDecorators(entityName: string) {
  return applyDecorators(
    ApiOperation({ summary: '测试服务器连接' }),
    ApiResponse({ status: 200, description: '连接测试结果' }),
    ApiResponse({ status: 404, description: `${entityName}不存在` }),
  );
}

@ApiTags('servers')
@ApiBearerAuth()
@Controller('servers')
export class ServersController extends BaseController<
  ServerEntity,
  CreateServerDto,
  UpdateServerDto,
  ServerQueryDto,
  ServersService
> {
  protected readonly entityName = '服务器';

  constructor(
    protected readonly service: ServersService,
    private readonly sshService: SshService,
  ) {
    super(service);
  }

  /**
   * 测试服务器连接
   * @param id 服务器ID
   * @returns 连接测试结果
   */
  @Post(':id/test')
  @TestConnectionDecorators('服务器')
  async testConnection(@Body('id') id: number) {
    await this.service.findOne(id);
    return this.sshService.testConnection(id);
  }

  /**
   * 批量导入服务器
   * @param importServersDto 服务器导入数据
   * @returns 导入结果
   */
  @Post('import')
  @ImportServersDecorators()
  async importServers(@Body() importServersDto: ImportServersDto) {
    return this.service.importServers(importServersDto);
  }
}
