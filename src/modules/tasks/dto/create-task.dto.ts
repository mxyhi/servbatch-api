import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, IsNotEmpty } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: '任务名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: '任务描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '要执行的命令' })
  @IsString()
  @IsNotEmpty()
  command: string;

  @ApiPropertyOptional({ description: '超时时间（秒）' })
  @IsInt()
  @Min(1)
  @IsOptional()
  timeout?: number;
}
