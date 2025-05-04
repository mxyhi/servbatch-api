import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsPositive, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';

/**
 * 命令监控执行查询参数DTO
 * 用于接收和验证命令监控执行查询参数
 */
export class CommandMonitorExecutionQueryDto extends PaginationParamsDto {
  @ApiPropertyOptional({ description: '命令监控ID（精确匹配）' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  monitorId?: number;

  @ApiPropertyOptional({ description: '服务器ID（精确匹配）' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  serverId?: number;

  @ApiPropertyOptional({ description: '是否执行了执行命令' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  executed?: boolean;

  @ApiPropertyOptional({ description: '开始日期（ISO格式）' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: '结束日期（ISO格式）' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
}
