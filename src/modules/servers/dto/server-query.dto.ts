import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';
import { ServerStatus, ConnectionType } from '../../../common/constants';
import {
  ServerStatusType,
  ConnectionTypeType,
} from '../../../common/constants';

/**
 * 服务器查询参数DTO
 * 用于接收和验证服务器查询参数
 */
export class ServerQueryDto
  extends PaginationParamsDto
  implements Record<string, unknown>
{
  // 添加索引签名以满足Record<string, unknown>约束
  [key: string]: unknown;

  @ApiPropertyOptional({
    description: '搜索关键词（同时搜索服务器名称和IP地址）',
  })
  @IsOptional()
  @IsString()
  search?: string;

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
    enum: Object.values(ServerStatus),
    enumName: 'ServerStatus',
  })
  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatusType;

  @ApiPropertyOptional({
    description: '连接类型',
    enum: Object.values(ConnectionType),
    enumName: 'ConnectionType',
  })
  @IsOptional()
  @IsEnum(ConnectionType)
  connectionType?: ConnectionTypeType;
}
