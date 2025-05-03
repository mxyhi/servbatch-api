import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskEntity } from './entities/task.entity';
import {
  PaginationResultDto,
  PaginationParamsDto,
  PaginationService,
} from '../../common';

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

  async findAll(
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskEntity>> {
    return this.paginationService.paginate<TaskEntity>(
      this.prisma.task,
      params,
      {}, // where
      { createdAt: 'desc' }, // orderBy
    );
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
