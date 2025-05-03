import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';

/**
 * 代理查询参数DTO
 * 用于接收和验证代理查询参数
 */
export class ProxyQueryDto extends PaginationParamsDto {
  @ApiPropertyOptional({ description: '代理ID（精确匹配）' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: '代理名称（模糊匹配）' })
  @IsOptional()
  @IsString()
  name?: string;
}
