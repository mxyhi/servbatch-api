import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Task } from '@prisma/client';

export class TaskEntity implements Task {
  @ApiProperty({ description: '任务ID' })
  id: number;

  @ApiProperty({ description: '任务名称' })
  name: string;

  @ApiPropertyOptional({ description: '任务描述' })
  description: string | null;

  @ApiProperty({ description: '要执行的命令' })
  command: string;

  @ApiPropertyOptional({ description: '超时时间（秒）' })
  timeout: number | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
