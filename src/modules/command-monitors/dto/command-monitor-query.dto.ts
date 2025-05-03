import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';

/**
 * 命令监控查询参数DTO
 * 用于接收和验证命令监控查询参数
 */
export class CommandMonitorQueryDto extends PaginationParamsDto {
  @ApiPropertyOptional({ description: '命令监控名称（模糊匹配）' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;

  @ApiPropertyOptional({ description: '服务器ID' })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  serverId?: number;
}
