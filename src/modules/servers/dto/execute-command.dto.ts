import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ExecuteCommandDto {
  @ApiProperty({ description: '要在服务器上执行的命令', example: 'ls -l /tmp' })
  @IsNotEmpty()
  @IsString()
  command: string;

  @ApiProperty({
    description: '命令执行超时时间 (秒)',
    example: 60,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeout?: number; // 单位：秒
}
