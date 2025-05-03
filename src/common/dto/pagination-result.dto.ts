import { ApiProperty } from '@nestjs/swagger';

/**
 * 分页结果DTO
 * 用于返回分页查询结果
 */
export class PaginationResultDto<T> {
  @ApiProperty({ description: '总记录数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  @ApiProperty({ description: '数据列表' })
  items: T[];
}
