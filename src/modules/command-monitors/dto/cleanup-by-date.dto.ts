import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CleanupByDateDto {
  @ApiProperty({ description: '开始日期（包含）', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({ description: '结束日期（包含）', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}
