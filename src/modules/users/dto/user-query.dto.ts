import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationParamsDto } from '../../../common/dto/pagination-params.dto';

/**
 * 用户查询参数DTO
 * 用于接收和验证用户查询参数
 */
export class UserQueryDto extends PaginationParamsDto {
  @ApiPropertyOptional({ description: '用户名（模糊匹配）' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: '电子邮件（模糊匹配）' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ 
    description: '用户角色',
    enum: ['admin', 'user']
  })
  @IsOptional()
  @IsEnum(['admin', 'user'])
  role?: string;

  @ApiPropertyOptional({ 
    description: '是否激活',
    type: Boolean
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
