import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCommandMonitorDto } from '../dto/create-command-monitor.dto';
import { UpdateCommandMonitorDto } from '../dto/update-command-monitor.dto';
import { CommandMonitorEntity } from '../entities/command-monitor.entity';
import { CommandMonitorExecutionEntity } from '../entities/command-monitor-execution.entity';
import { CommandMonitorQueryDto } from '../dto/command-monitor-query.dto';
import { CommandMonitorExecutionQueryDto } from '../dto/command-monitor-execution-query.dto';
import { ServersService } from '../../servers/servers.service';
import { CleanupByDateDto } from '../dto/cleanup-by-date.dto';
import { CleanupResultDto } from '../dto/cleanup-result.dto';
import { PaginationResultDto, PaginationService } from '../../../common';
import { BaseCommandMonitorService } from './base-command-monitor.service';
import { ExecutionService } from './execution.service';

/**
 * 命令监控服务
 * 整合基础服务和执行记录服务
 */
@Injectable()
export class CommandMonitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serversService: ServersService,
    private readonly paginationService: PaginationService,
    private readonly baseService: BaseCommandMonitorService,
    private readonly executionService: ExecutionService,
  ) {}

  // 基础CRUD操作，委托给基础服务

  async create(
    createCommandMonitorDto: CreateCommandMonitorDto,
  ): Promise<CommandMonitorEntity> {
    return this.baseService.create(createCommandMonitorDto);
  }

  async findByLimit(
    params: CommandMonitorQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorEntity>> {
    return this.baseService.findByLimit(params);
  }

  async findAll(
    params: CommandMonitorQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorEntity>> {
    return this.baseService.findAll(params);
  }

  async findOne(id: number): Promise<CommandMonitorEntity> {
    return this.baseService.findOne(id);
  }

  async update(
    id: number,
    updateCommandMonitorDto: UpdateCommandMonitorDto,
  ): Promise<CommandMonitorEntity> {
    return this.baseService.update(id, updateCommandMonitorDto);
  }

  async remove(id: number): Promise<CommandMonitorEntity> {
    return this.baseService.remove(id);
  }

  async enable(id: number): Promise<CommandMonitorEntity> {
    return this.baseService.enable(id);
  }

  async disable(id: number): Promise<CommandMonitorEntity> {
    return this.baseService.disable(id);
  }

  async getAllEnabledMonitors(): Promise<CommandMonitorEntity[]> {
    return this.baseService.getAllEnabledMonitors();
  }

  // 执行记录操作，委托给执行记录服务

  async getExecutions(
    monitorId: number,
    params: CommandMonitorExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorExecutionEntity>> {
    return this.executionService.getExecutions(monitorId, params);
  }

  async cleanupExecutionsByDate(
    monitorId: number,
    cleanupDto: CleanupByDateDto,
  ): Promise<CleanupResultDto> {
    return this.executionService.cleanupExecutionsByDate(monitorId, cleanupDto);
  }

  async cleanupExecutionsByMonitorId(
    monitorId: number,
  ): Promise<CleanupResultDto> {
    return this.executionService.cleanupExecutionsByMonitorId(monitorId);
  }

  async cleanupExecutionsByServerId(
    serverId: number,
  ): Promise<CleanupResultDto> {
    return this.executionService.cleanupExecutionsByServerId(serverId);
  }

  async recordExecution(
    monitorId: number,
    serverId: number,
    checkOutput: string,
    checkExitCode: number,
    executed: boolean,
    executeOutput?: string,
    executeExitCode?: number,
  ): Promise<CommandMonitorExecutionEntity> {
    return this.executionService.recordExecution(
      monitorId,
      serverId,
      checkOutput,
      checkExitCode,
      executed,
      executeOutput,
      executeExitCode,
    );
  }

  async getAllExecutions(
    params: CommandMonitorExecutionQueryDto = { page: 1, pageSize: 10 },
  ): Promise<PaginationResultDto<CommandMonitorExecutionEntity>> {
    return this.executionService.getAllExecutions(params);
  }
}
