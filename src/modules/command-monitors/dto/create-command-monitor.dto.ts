import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsBoolean, IsOptional, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateCommandMonitorDto {
  @ApiProperty({ description: '命令监控名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '命令监控描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '检查命令是否在运行的命令' })
  @IsString()
  @IsNotEmpty()
  checkCommand: string;

  @ApiProperty({ description: '如果检查命令返回非0，则执行此命令' })
  @IsString()
  @IsNotEmpty()
  executeCommand: string;

  @ApiPropertyOptional({ description: '是否启用此监控', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = true;

  @ApiProperty({ description: '服务器ID' })
  @IsInt()
  @IsPositive()
  serverId: number;
}
