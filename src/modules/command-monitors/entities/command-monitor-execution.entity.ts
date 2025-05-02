import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommandMonitorExecution } from '@prisma/client';

export class CommandMonitorExecutionEntity implements CommandMonitorExecution {
  @ApiProperty({ description: '执行记录ID' })
  id: number;

  @ApiPropertyOptional({ description: '检查命令的输出' })
  checkOutput: string | null;

  @ApiProperty({ description: '检查命令的退出码' })
  checkExitCode: number;

  @ApiProperty({ description: '是否执行了执行命令' })
  executed: boolean;

  @ApiPropertyOptional({ description: '执行命令的输出' })
  executeOutput: string | null;

  @ApiPropertyOptional({ description: '执行命令的退出码' })
  executeExitCode: number | null;

  @ApiProperty({ description: '执行时间' })
  executedAt: Date;

  @ApiProperty({ description: '命令监控ID' })
  monitorId: number;

  @ApiProperty({ description: '服务器ID' })
  serverId: number;
}
