import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';

/**
 * 任务查询参数DTO
 * 用于接收和验证任务查询参数
 */
export class TaskQueryDto extends PaginationParamsDto {
  @ApiPropertyOptional({ description: '任务名称（模糊匹配）' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '任务命令（模糊匹配）' })
  @IsOptional()
  @IsString()
  command?: string;
}
