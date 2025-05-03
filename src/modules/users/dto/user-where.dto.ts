import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { WhereInputBase, PaginationWithWhereDto } from '../../../common/dto/pagination-where.dto';

/**
 * 用户查询条件DTO
 * 用于定义用户查询的条件
 */
export class UserWhereInput extends WhereInputBase {
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

/**
 * 用户分页查询DTO
 * 结合了分页参数和用户查询条件
 */
export class UserPaginationDto extends PaginationWithWhereDto<UserWhereInput> {
  // 设置泛型类型，用于运行时类型推断
  static whereType = UserWhereInput;
}
