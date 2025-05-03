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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskEntity } from './entities/task.entity';
import { TaskExecutionsService } from '../task-executions/task-executions.service';
import { CreateTaskExecutionDto } from '../task-executions/dto/create-task-execution.dto';
import {
  PaginationResultDto,
  PaginationParamsDto,
  ParsePaginationPipe,
} from '../../common';
import { TaskQueryDto } from './dto/task-query.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskExecutionsService: TaskExecutionsService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建任务' })
  @ApiResponse({ status: 201, description: '任务创建成功', type: TaskEntity })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: '分页获取任务列表' })
  @ApiResponse({
    status: 200,
    description: '返回分页的任务列表',
    schema: {
      allOf: [
        { $ref: '#/components/schemas/PaginationResultDto' },
        {
          properties: {
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/TaskEntity' },
            },
          },
        },
      ],
    },
  })
  findAll(@Query(ParsePaginationPipe) params: TaskQueryDto) {
    return this.tasksService.findByLimit(params);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '返回指定任务', type: TaskEntity })
  @ApiResponse({ status: 404, description: '任务不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '任务更新成功', type: TaskEntity })
  @ApiResponse({ status: 404, description: '任务不存在' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '任务删除成功', type: TaskEntity })
  @ApiResponse({ status: 404, description: '任务不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: '执行任务' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '任务已添加到队列' })
  @ApiResponse({ status: 404, description: '任务或服务器不存在' })
  async executeTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() executeDto: { serverIds: number[]; priority?: number },
  ) {
    // 验证任务是否存在
    await this.tasksService.findOne(id);

    const createTaskExecutionDto: CreateTaskExecutionDto = {
      taskId: id,
      serverIds: executeDto.serverIds,
      priority: executeDto.priority || 0,
    };

    return this.taskExecutionsService.create(createTaskExecutionDto);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: '分页获取任务执行历史' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({
    status: 200,
    description: '返回分页的任务执行历史',
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
  @ApiResponse({ status: 404, description: '任务不存在' })
  async getTaskExecutions(
    @Param('id', ParseIntPipe) id: number,
    @Query(ParsePaginationPipe) params: PaginationParamsDto,
  ) {
    // 验证任务是否存在
    await this.tasksService.findOne(id);
    return this.taskExecutionsService.findByTaskId(id, params);
  }
}
