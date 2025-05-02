import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskExecution } from '@prisma/client';

export class TaskExecutionEntity implements TaskExecution {
  @ApiProperty({ description: '执行记录ID' })
  id: number;

  @ApiProperty({ description: '执行状态', enum: ['queued', 'running', 'completed', 'failed', 'cancelled'] })
  status: string;

  @ApiPropertyOptional({ description: '执行输出' })
  output: string | null;

  @ApiPropertyOptional({ description: '退出代码' })
  exitCode: number | null;

  @ApiPropertyOptional({ description: '开始执行时间' })
  startedAt: Date | null;

  @ApiPropertyOptional({ description: '完成时间' })
  completedAt: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '任务ID' })
  taskId: number;

  @ApiProperty({ description: '服务器ID' })
  serverId: number;
}
