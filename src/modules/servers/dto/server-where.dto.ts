import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WhereInputBase, PaginationWithWhereDto } from '../../../common/dto/pagination-where.dto';

/**
 * 服务器查询条件DTO
 * 用于定义服务器查询的条件
 */
export class ServerWhereInput extends WhereInputBase {
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

/**
 * 服务器分页查询DTO
 * 结合了分页参数和服务器查询条件
 */
export class ServerPaginationDto extends PaginationWithWhereDto<ServerWhereInput> {
  // 设置泛型类型，用于运行时类型推断
  static whereType = ServerWhereInput;
}
