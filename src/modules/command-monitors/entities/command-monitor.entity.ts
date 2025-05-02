import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommandMonitor } from '@prisma/client';

export class CommandMonitorEntity implements CommandMonitor {
  @ApiProperty({ description: '命令监控ID' })
  id: number;

  @ApiProperty({ description: '命令监控名称' })
  name: string;

  @ApiPropertyOptional({ description: '命令监控描述' })
  description: string | null;

  @ApiProperty({ description: '检查命令是否在运行的命令' })
  checkCommand: string;

  @ApiProperty({ description: '如果检查命令返回非0，则执行此命令' })
  executeCommand: string;

  @ApiProperty({ description: '是否启用此监控' })
  enabled: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '服务器ID' })
  serverId: number;
}
