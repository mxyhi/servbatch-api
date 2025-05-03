import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SearchParamsDto } from './search-params.dto';

/**
 * 分页参数DTO
 * 用于接收和验证分页参数
 * 继承自SearchParamsDto，包含通用查询参数
 */
export class PaginationParamsDto extends SearchParamsDto {
  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 10;
}
