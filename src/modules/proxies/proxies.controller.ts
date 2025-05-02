import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProxiesService } from './proxies.service';
import { CreateProxyDto } from './dto/create-proxy.dto';
import { UpdateProxyDto } from './dto/update-proxy.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProxyEntity } from './entities/proxy.entity';

@ApiTags('proxies')
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
  @ApiOperation({ summary: '获取所有代理' })
  @ApiResponse({
    status: 200,
    description: '返回所有代理列表',
    type: [ProxyEntity],
  })
  findAll() {
    return this.proxiesService.findAll();
  }

  @Get('online')
  @ApiOperation({ summary: '获取所有在线代理' })
  @ApiResponse({
    status: 200,
    description: '返回所有在线代理列表',
    type: [ProxyEntity],
  })
  getOnlineProxies() {
    return this.proxiesService.getOnlineProxies();
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
