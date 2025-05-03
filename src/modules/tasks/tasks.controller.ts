import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
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
} from '@nestjs/swagger';
import { TaskEntity } from './entities/task.entity';
import { TaskExecutionsService } from '../task-executions/task-executions.service';
import { CreateTaskExecutionDto } from '../task-executions/dto/create-task-execution.dto';

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
  @ApiOperation({ summary: '获取所有任务' })
  @ApiResponse({
    status: 200,
    description: '返回所有任务列表',
    type: [TaskEntity],
  })
  findAll() {
    return this.tasksService.findAll();
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
  @ApiOperation({ summary: '获取任务执行历史' })
  @ApiParam({ name: 'id', description: '任务ID' })
  @ApiResponse({ status: 200, description: '返回任务执行历史' })
  @ApiResponse({ status: 404, description: '任务不存在' })
  async getTaskExecutions(@Param('id', ParseIntPipe) id: number) {
    // 验证任务是否存在
    await this.tasksService.findOne(id);
    return this.taskExecutionsService.findByTaskId(id);
  }
}
