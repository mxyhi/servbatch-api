import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray } from 'class-validator';
import { TaskExecutionStatus, TaskExecutionStatusType } from '../../../common';

export class CleanupByStatusDto {
  @ApiProperty({
    description: '要清理的状态列表',
    enum: Object.values(TaskExecutionStatus),
    isArray: true,
    example: [TaskExecutionStatus.COMPLETED, TaskExecutionStatus.FAILED],
  })
  @IsArray()
  @IsEnum(TaskExecutionStatus, { each: true })
  statuses: string[];
}
