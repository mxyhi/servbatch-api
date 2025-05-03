import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CommandMonitorsService } from './command-monitors.service';
import { CreateCommandMonitorDto } from './dto/create-command-monitor.dto';
import { UpdateCommandMonitorDto } from './dto/update-command-monitor.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommandMonitorEntity } from './entities/command-monitor.entity';
import { CommandMonitorExecutionEntity } from './entities/command-monitor-execution.entity';
import { PaginationResultDto } from './dto/pagination-result.dto';
import { CleanupByDateDto } from './dto/cleanup-by-date.dto';
import { CleanupResultDto } from './dto/cleanup-result.dto';

@ApiTags('command-monitors')
@ApiBearerAuth()
@Controller('command-monitors')
export class CommandMonitorsController {
  constructor(
    private readonly commandMonitorsService: CommandMonitorsService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建命令监控' })
  @ApiResponse({
    status: 201,
    description: '命令监控创建成功',
    type: CommandMonitorEntity,
  })
  create(@Body() createCommandMonitorDto: CreateCommandMonitorDto) {
    return this.commandMonitorsService.create(createCommandMonitorDto);
  }

  @Get()
  @ApiOperation({ summary: '获取所有命令监控' })
  @ApiResponse({
    status: 200,
    description: '返回所有命令监控列表',
    type: [CommandMonitorEntity],
  })
  findAll() {
    return this.commandMonitorsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定命令监控' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiResponse({
    status: 200,
    description: '返回指定命令监控',
    type: CommandMonitorEntity,
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.commandMonitorsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新命令监控' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiResponse({
    status: 200,
    description: '命令监控更新成功',
    type: CommandMonitorEntity,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCommandMonitorDto: UpdateCommandMonitorDto,
  ) {
    return this.commandMonitorsService.update(id, updateCommandMonitorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除命令监控' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiResponse({
    status: 200,
    description: '命令监控删除成功',
    type: CommandMonitorEntity,
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.commandMonitorsService.remove(id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: '启用命令监控' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiResponse({
    status: 200,
    description: '命令监控启用成功',
    type: CommandMonitorEntity,
  })
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.commandMonitorsService.enable(id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: '禁用命令监控' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiResponse({
    status: 200,
    description: '命令监控禁用成功',
    type: CommandMonitorEntity,
  })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.commandMonitorsService.disable(id);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: '获取命令监控执行历史' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiQuery({
    name: 'page',
    description: '页码',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: '每页数量',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: '返回命令监控执行历史',
    type: PaginationResultDto,
  })
  getExecutions(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.commandMonitorsService.getExecutions(
      id,
      page ? parseInt(page as any) : 1,
      pageSize ? parseInt(pageSize as any) : 10,
    );
  }

  @Post(':id/executions/cleanup')
  @ApiOperation({ summary: '根据日期范围清理命令监控执行历史' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiBody({ type: CleanupByDateDto })
  @ApiResponse({ status: 200, description: '清理结果', type: CleanupResultDto })
  cleanupExecutionsByDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() cleanupDto: CleanupByDateDto,
  ) {
    return this.commandMonitorsService.cleanupExecutionsByDate(id, cleanupDto);
  }

  @Delete(':id/executions')
  @ApiOperation({ summary: '清理指定命令监控的所有执行历史' })
  @ApiParam({ name: 'id', description: '命令监控ID' })
  @ApiResponse({ status: 200, description: '清理结果', type: CleanupResultDto })
  cleanupExecutionsByMonitorId(@Param('id', ParseIntPipe) id: number) {
    return this.commandMonitorsService.cleanupExecutionsByMonitorId(id);
  }

  @Delete('executions/server/:serverId')
  @ApiOperation({ summary: '清理指定服务器的所有命令监控执行历史' })
  @ApiParam({ name: 'serverId', description: '服务器ID' })
  @ApiResponse({ status: 200, description: '清理结果', type: CleanupResultDto })
  cleanupExecutionsByServerId(
    @Param('serverId', ParseIntPipe) serverId: number,
  ) {
    return this.commandMonitorsService.cleanupExecutionsByServerId(serverId);
  }
}
