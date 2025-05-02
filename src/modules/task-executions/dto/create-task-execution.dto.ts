import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsArray, IsOptional, IsPositive } from 'class-validator';

export class CreateTaskExecutionDto {
  @ApiProperty({ description: '任务ID' })
  @IsInt()
  @IsPositive()
  taskId: number;

  @ApiProperty({ description: '服务器ID列表', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  serverIds: number[];

  @ApiProperty({ description: '优先级', default: 0 })
  @IsInt()
  @IsOptional()
  priority?: number = 0;
}
