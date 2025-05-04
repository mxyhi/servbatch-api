import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray } from 'class-validator';
import { TaskExecutionStatus, TaskExecutionStatusType } from '../../../common';

export class CleanupByStatusDto {
  @ApiProperty({
    description: '要清理的状态列表',
    enum: TaskExecutionStatus,
    isArray: true,
    example: ['completed', 'failed'],
  })
  @IsArray()
  @IsEnum(TaskExecutionStatus, { each: true })
  statuses: TaskExecutionStatus[];
}
