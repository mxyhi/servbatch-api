import { Injectable } from '@nestjs/common';
import { TaskExecutionEntity } from '../entities/task-execution.entity';
import { CreateTaskExecutionDto } from '../dto/create-task-execution.dto';
import { CleanupByDateDto } from '../dto/cleanup-by-date.dto';
import { CleanupByStatusDto } from '../dto/cleanup-by-status.dto';
import { CleanupResultDto } from '../dto/cleanup-result.dto';
import { TaskExecutionQueryDto } from '../dto/task-execution-query.dto';
import { PaginationResultDto, PaginationParamsDto } from '../../../common';
import { BaseTaskExecutionService } from './base-task-execution.service';
import { CleanupService } from './cleanup.service';

/**
 * 任务执行服务
 * 整合基础服务和清理服务
 */
@Injectable()
export class TaskExecutionsService {
  constructor(
    private readonly baseService: BaseTaskExecutionService,
    private readonly cleanupService: CleanupService,
  ) {}

  // 基础CRUD操作，委托给基础服务

  async create(
    createTaskExecutionDto: CreateTaskExecutionDto,
  ): Promise<{ message: string; queueId: number }> {
    return this.baseService.create(createTaskExecutionDto);
  }

  async findByLimit(
    params: TaskExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.baseService.findByLimit(params);
  }

  async findAll(
    params: TaskExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.baseService.findAll(params);
  }

  async findOne(id: number): Promise<TaskExecutionEntity> {
    return this.baseService.findOne(id);
  }

  async findByTaskId(
    taskId: number,
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.baseService.findByTaskId(taskId, params);
  }

  async findByServerId(
    serverId: number,
    params: PaginationParamsDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<TaskExecutionEntity>> {
    return this.baseService.findByServerId(serverId, params);
  }

  async cancel(id: number): Promise<TaskExecutionEntity> {
    return this.baseService.cancel(id);
  }

  async remove(id: number): Promise<TaskExecutionEntity> {
    return this.baseService.remove(id);
  }

  // 清理操作，委托给清理服务

  async cleanupByDate(cleanupDto: CleanupByDateDto): Promise<CleanupResultDto> {
    return this.cleanupService.cleanupByDate(cleanupDto);
  }

  async cleanupByStatus(
    cleanupDto: CleanupByStatusDto,
  ): Promise<CleanupResultDto> {
    return this.cleanupService.cleanupByStatus(cleanupDto);
  }

  async cleanupByTaskId(taskId: number): Promise<CleanupResultDto> {
    return this.cleanupService.cleanupByTaskId(taskId);
  }

  async cleanupByServerId(serverId: number): Promise<CleanupResultDto> {
    return this.cleanupService.cleanupByServerId(serverId);
  }
}
