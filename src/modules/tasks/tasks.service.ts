import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import { PaginationResultDto, PaginationService } from '../../common';
import { TaskQueryDto } from './dto/task-query.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationService: PaginationService,
  ) {}

  async create(createTaskDto: CreateTaskDto): Promise<TaskEntity> {
    return this.prisma.task.create({
      data: createTaskDto,
    });
  }

  async findByLimit(
    params: TaskQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskEntity>> {
    // 构建查询条件
    const where: any = {};

    // 处理特定字段的查询
    if (params.name) {
      where.name = {
        contains: params.name,
      };
    }

    if (params.command) {
      where.command = {
        contains: params.command,
      };
    }

    // 使用分页服务进行查询
    return this.paginationService.paginateByLimit<TaskEntity>(
      this.prisma.task,
      params,
      where, // where
      { createdAt: 'desc' }, // orderBy
      {}, // include
    );
  }

  /**
   * 分页获取任务列表（别名，保持向后兼容）
   * @deprecated 请使用 findByLimit 方法
   */
  async findAll(
    params: TaskQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskEntity>> {
    return this.findByLimit(params);
  }

  async findOne(id: number): Promise<TaskEntity> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`任务ID ${id} 不存在`);
    }

    return task;
  }

  async update(id: number, updateTaskDto: UpdateTaskDto): Promise<TaskEntity> {
    try {
      return await this.prisma.task.update({
        where: { id },
        data: updateTaskDto,
      });
    } catch (error) {
      throw new NotFoundException(`任务ID ${id} 不存在`);
    }
  }

  async remove(id: number): Promise<TaskEntity> {
    try {
      // 先检查任务是否存在
      await this.findOne(id);

      // 使用事务确保原子性操作
      return await this.prisma.$transaction(async (tx) => {
        // 1. 删除与任务相关的所有执行历史记录
        const { count } = await tx.taskExecution.deleteMany({
          where: { taskId: id },
        });

        this.logger.log(`已删除任务ID ${id} 的 ${count} 条执行历史记录`);

        // 2. 删除任务
        return await tx.task.delete({
          where: { id },
        });
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`删除任务ID ${id} 失败: ${error.message}`);
    }
  }
}
