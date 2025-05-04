import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 排序方向枚举
 */
export const SortOrder = {
  ASCEND: 'ascend',
  DESCEND: 'descend',
} as const;

export type SortOrderType = (typeof SortOrder)[keyof typeof SortOrder];

/**
 * 分页参数DTO
 * 用于接收和验证分页参数
 */
export class PaginationParamsDto {
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
