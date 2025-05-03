import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ServersService } from './servers.service';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ServerEntity } from './entities/server.entity';
import { SshService } from '../ssh/ssh.service';
import {
  ImportServersDto,
  ImportServersResultDto,
} from './dto/import-servers.dto';
import { ParsePaginationPipe } from '../../common';
import { ServerQueryDto } from './dto/server-query.dto';

@ApiTags('servers')
@ApiBearerAuth()
@Controller('servers')
@ApiExtraModels(ServerQueryDto)
export class ServersController {
  constructor(
    private readonly serversService: ServersService,
    private readonly sshService: SshService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建服务器' })
  @ApiResponse({
    status: 201,
    description: '服务器创建成功',
    type: ServerEntity,
  })
  create(@Body() createServerDto: CreateServerDto) {
    return this.serversService.create(createServerDto);
  }

  @Get()
  @ApiOperation({ summary: '分页获取服务器列表' })
  @ApiQuery({
    type: ServerQueryDto,
  })
  @ApiResponse({
    status: 200,
    description: '返回分页的服务器列表',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResultDto' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/ServerEntity' },
            },
          },
        },
      ],
    },
  })
  findAll(@Query(ParsePaginationPipe) params: ServerQueryDto) {
    // 直接使用查询参数
    return this.serversService.findByLimit(params);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定服务器' })
  @ApiParam({ name: 'id', description: '服务器ID' })
  @ApiResponse({
    status: 200,
    description: '返回指定服务器',
    type: ServerEntity,
  })
  @ApiResponse({ status: 404, description: '服务器不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serversService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新服务器' })
  @ApiParam({ name: 'id', description: '服务器ID' })
  @ApiResponse({
    status: 200,
    description: '服务器更新成功',
    type: ServerEntity,
  })
  @ApiResponse({ status: 404, description: '服务器不存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServerDto: UpdateServerDto,
  ) {
    return this.serversService.update(id, updateServerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除服务器' })
  @ApiParam({ name: 'id', description: '服务器ID' })
  @ApiResponse({
    status: 200,
    description: '服务器删除成功',
    type: ServerEntity,
  })
  @ApiResponse({ status: 404, description: '服务器不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.serversService.remove(id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: '测试服务器连接' })
  @ApiParam({ name: 'id', description: '服务器ID' })
  @ApiResponse({ status: 200, description: '连接测试结果' })
  @ApiResponse({ status: 404, description: '服务器不存在' })
  async testConnection(@Param('id', ParseIntPipe) id: number) {
    await this.serversService.findOne(id);
    return this.sshService.testConnection(id);
  }

  @Post('import')
  @ApiOperation({ summary: '批量导入服务器' })
  @ApiBody({ type: ImportServersDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量导入结果',
    type: ImportServersResultDto,
  })
  async importServers(@Body() importServersDto: ImportServersDto) {
    return this.serversService.importServers(importServersDto);
  }
}
