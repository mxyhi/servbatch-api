import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsPositive, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';

/**
 * 任务执行状态枚举
 */
export const TaskExecutionStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type TaskExecutionStatusType = typeof TaskExecutionStatus[keyof typeof TaskExecutionStatus];

/**
 * 任务执行查询参数DTO
 * 用于接收和验证任务执行查询参数
 */
export class TaskExecutionQueryDto extends PaginationParamsDto {
  @ApiPropertyOptional({ description: '任务ID（精确匹配）' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  taskId?: number;

  @ApiPropertyOptional({ description: '服务器ID（精确匹配）' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  serverId?: number;

  @ApiPropertyOptional({ 
    description: '执行状态',
    enum: Object.values(TaskExecutionStatus),
    example: TaskExecutionStatus.COMPLETED
  })
  @IsOptional()
  @IsEnum(TaskExecutionStatus)
  status?: TaskExecutionStatusType;

  @ApiPropertyOptional({ description: '开始日期（ISO格式）' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: '结束日期（ISO格式）' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}
