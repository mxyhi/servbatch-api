import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';

/**
 * 服务器查询参数DTO
 * 用于接收和验证服务器查询参数
 */
export class ServerQueryDto extends PaginationParamsDto {
  @ApiPropertyOptional({ description: '服务器名称（模糊匹配）' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '服务器主机地址（模糊匹配）' })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ 
    description: '服务器状态',
    enum: ['online', 'offline', 'unknown']
  })
  @IsOptional()
  @IsEnum(['online', 'offline', 'unknown'])
  status?: string;

  @ApiPropertyOptional({ 
    description: '连接类型',
    enum: ['direct', 'proxy']
  })
  @IsOptional()
  @IsEnum(['direct', 'proxy'])
  connectionType?: string;
}
