import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SortOrder, SortOrderType, PaginationDefaults } from '../constants';

/**
 * 分页参数DTO
 * 用于接收和验证分页参数
 */
export class PaginationParamsDto {
  @ApiProperty({
    description: '页码',
    default: PaginationDefaults.PAGE,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = PaginationDefaults.PAGE;

  @ApiProperty({
    description: '每页数量',
    default: PaginationDefaults.PAGE_SIZE,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PaginationDefaults.MAX_PAGE_SIZE)
  @Type(() => Number)
  pageSize?: number = PaginationDefaults.PAGE_SIZE;

  @ApiPropertyOptional({ description: '排序字段' })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: Object.values(SortOrder),
    example: SortOrder.ASCEND,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrderType;
}
