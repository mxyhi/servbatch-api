import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDate, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 通用查询参数DTO
 * 用于接收和验证查询参数
 */
export class SearchParamsDto {
  @ApiPropertyOptional({
    description: '创建开始时间',
    type: Date,
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAtStart?: Date;

  @ApiPropertyOptional({
    description: '创建结束时间',
    type: Date,
    example: '2023-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdAtEnd?: Date;

  @ApiPropertyOptional({
    description: '更新开始时间',
    type: Date,
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAtStart?: Date;

  @ApiPropertyOptional({
    description: '更新结束时间',
    type: Date,
    example: '2023-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedAtEnd?: Date;

  @ApiPropertyOptional({
    description: '关键字搜索（在支持的字段中进行模糊匹配）',
    type: String,
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}
