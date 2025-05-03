import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';
import { ProxyQueryDto } from './dto/proxy-query.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProxyEntity } from './entities/proxy.entity';
import { ParsePaginationPipe, PaginationResultDto } from '../../common';

@ApiTags('proxies')
@ApiBearerAuth()
@Controller('proxies')
export class ProxiesController {
  constructor(private readonly proxiesService: ProxiesService) {}

  @Post()
  @ApiOperation({ summary: '创建代理' })
  @ApiResponse({
    status: 201,
    description: '代理创建成功',
    type: ProxyEntity,
  })
  create(@Body() createProxyDto: CreateProxyDto) {
    return this.proxiesService.create(createProxyDto);
  }

  @Get()
  @ApiOperation({ summary: '分页获取代理列表' })
  @ApiResponse({
    status: 200,
    description: '返回分页的代理列表',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResultDto' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProxyEntity' },
            },
          },
        },
      ],
    },
  })
  findAll(@Query(ParsePaginationPipe) params: ProxyQueryDto) {
    return this.proxiesService.findByLimit(params);
  }

  @Get('online')
  @ApiOperation({ summary: '分页获取所有在线代理' })
  @ApiResponse({
    status: 200,
    description: '返回分页的在线代理列表',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResultDto' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/ProxyEntity' },
            },
          },
        },
      ],
    },
  })
  getOnlineProxies(@Query(ParsePaginationPipe) params: ProxyQueryDto) {
    return this.proxiesService.getOnlineProxies(params);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定代理' })
  @ApiParam({ name: 'id', description: '代理ID' })
  @ApiResponse({
    status: 200,
    description: '返回指定代理',
    type: ProxyEntity,
  })
  @ApiResponse({ status: 404, description: '代理不存在' })
  findOne(@Param('id') id: string) {
    return this.proxiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新代理' })
  @ApiParam({ name: 'id', description: '代理ID' })
  @ApiResponse({
    status: 200,
    description: '代理更新成功',
    type: ProxyEntity,
  })
  @ApiResponse({ status: 404, description: '代理不存在' })
  update(@Param('id') id: string, @Body() updateProxyDto: UpdateProxyDto) {
    return this.proxiesService.update(id, updateProxyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除代理' })
  @ApiParam({ name: 'id', description: '代理ID' })
  @ApiResponse({
    status: 200,
    description: '代理删除成功',
    type: ProxyEntity,
  })
  @ApiResponse({ status: 404, description: '代理不存在' })
  remove(@Param('id') id: string) {
    return this.proxiesService.remove(id);
  }
}
