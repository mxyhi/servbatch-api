import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { TaskExecutionsService } from './task-executions.service';
import { CreateTaskExecutionDto } from './dto/create-task-execution.dto';
import { CleanupByDateDto } from './dto/cleanup-by-date.dto';
import { CleanupByStatusDto } from './dto/cleanup-by-status.dto';
import { CleanupResultDto } from './dto/cleanup-result.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskExecutionEntity } from './entities/task-execution.entity';
import {
  PaginationResultDto,
  PaginationParamsDto,
  ParsePaginationPipe,
} from '../../common';

@ApiTags('executions')
@ApiBearerAuth()
@Controller('executions')
export class TaskExecutionsController {
  constructor(private readonly taskExecutionsService: TaskExecutionsService) {}

  @Post()
  @ApiOperation({ summary: '创建任务执行' })
  @ApiResponse({ status: 201, description: '任务已添加到队列' })
  create(@Body() createTaskExecutionDto: CreateTaskExecutionDto) {
    return this.taskExecutionsService.create(createTaskExecutionDto);
  }

  @Get()
  @ApiOperation({ summary: '分页获取执行记录' })
  @ApiResponse({
    status: 200,
    description: '返回分页的执行记录',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResultDto' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/TaskExecutionEntity' },
            },
          },
        },
      ],
    },
  })
  findAll(@Query(ParsePaginationPipe) params: PaginationParamsDto) {
    return this.taskExecutionsService.findByLimit(params);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定执行记录' })
  @ApiParam({ name: 'id', description: '执行记录ID' })
  @ApiResponse({
    status: 200,
    description: '返回指定执行记录',
    type: TaskExecutionEntity,
  })
  @ApiResponse({ status: 404, description: '执行记录不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskExecutionsService.findOne(id);
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: '分页获取指定任务的执行记录' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '返回分页的任务执行记录',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResultDto' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/TaskExecutionEntity' },
            },
          },
        },
      ],
    },
  })
  findByTaskId(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Query(ParsePaginationPipe) params: PaginationParamsDto,
  ) {
    return this.taskExecutionsService.findByTaskId(taskId, params);
  }

  @Get('server/:serverId')
  @ApiOperation({ summary: '分页获取指定服务器的执行记录' })
  @ApiParam({ name: 'serverId', description: '服务器ID' })
  @ApiResponse({
    status: 200,
    description: '返回分页的服务器执行记录',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResultDto' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/TaskExecutionEntity' },
            },
          },
        },
      ],
    },
  })
  findByServerId(
    @Param('serverId', ParseIntPipe) serverId: number,
    @Query(ParsePaginationPipe) params: PaginationParamsDto,
  ) {
    return this.taskExecutionsService.findByServerId(serverId, params);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消执行中的任务' })
  @ApiParam({ name: 'id', description: '执行记录ID' })
  @ApiResponse({
    status: 200,
    description: '任务已取消',
    type: TaskExecutionEntity,
  })
  @ApiResponse({ status: 404, description: '执行记录不存在' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.taskExecutionsService.cancel(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除执行记录' })
  @ApiParam({ name: 'id', description: '执行记录ID' })
  @ApiResponse({
    status: 200,
    description: '执行记录删除成功',
    type: TaskExecutionEntity,
  })
  @ApiResponse({ status: 404, description: '执行记录不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.taskExecutionsService.remove(id);
  }

  @Post('cleanup/by-date')
  @ApiOperation({ summary: '根据日期范围清理执行历史记录' })
  @ApiBody({ type: CleanupByDateDto })
  @ApiResponse({ status: 200, description: '清理结果', type: CleanupResultDto })
  cleanupByDate(@Body() cleanupDto: CleanupByDateDto) {
    return this.taskExecutionsService.cleanupByDate(cleanupDto);
  }

  @Post('cleanup/by-status')
  @ApiOperation({ summary: '根据状态清理执行历史记录' })
  @ApiBody({ type: CleanupByStatusDto })
  @ApiResponse({ status: 200, description: '清理结果', type: CleanupResultDto })
  cleanupByStatus(@Body() cleanupDto: CleanupByStatusDto) {
    return this.taskExecutionsService.cleanupByStatus(cleanupDto);
  }

  @Delete('cleanup/task/:taskId')
  @ApiOperation({ summary: '清理指定任务的所有执行历史记录' })
  @ApiParam({ name: 'taskId', description: '任务ID' })
  @ApiResponse({ status: 200, description: '清理结果', type: CleanupResultDto })
  @ApiResponse({ status: 404, description: '任务不存在' })
  cleanupByTaskId(@Param('taskId', ParseIntPipe) taskId: number) {
    return this.taskExecutionsService.cleanupByTaskId(taskId);
  }

  @Delete('cleanup/server/:serverId')
  @ApiOperation({ summary: '清理指定服务器的所有执行历史记录' })
  @ApiParam({ name: 'serverId', description: '服务器ID' })
  @ApiResponse({ status: 200, description: '清理结果', type: CleanupResultDto })
  @ApiResponse({ status: 404, description: '服务器不存在' })
  cleanupByServerId(@Param('serverId', ParseIntPipe) serverId: number) {
    return this.taskExecutionsService.cleanupByServerId(serverId);
  }
}
