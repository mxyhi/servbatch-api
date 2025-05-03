import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { PaginationParamsDto } from './pagination-params.dto';

/**
 * 通用的Where输入类型
 * 可以被扩展以添加特定实体的查询条件
 *
 * 示例:
 * ```typescript
 * class UserWhereInput extends WhereInputBase {
 *   @IsOptional()
 *   @IsString()
 *   username?: string;
 *
 *   @IsOptional()
 *   @IsString()
 *   email?: string;
 * }
 * ```
 */
export class WhereInputBase {}

/**
 * 带有Where参数的分页DTO
 * 用于接收和验证分页参数和查询条件
 *
 * 使用方法:
 * 1. 创建一个继承自WhereInputBase的类，定义查询条件
 * 2. 创建一个继承自PaginationWithWhereDto的类，使用上面的类作为泛型参数
 * 3. 在控制器中使用这个类作为查询参数类型
 *
 * 示例:
 * ```typescript
 * class UserPaginationDto extends PaginationWithWhereDto<UserWhereInput> {
 *   static whereType = UserWhereInput;
 * }
 *
 * @Get()
 * findAll(@Query(ParsePaginationPipe) params: UserPaginationDto) {
 *   // 使用params.where访问查询条件
 * }
 * ```
 *
 * @template T - Where条件的类型
 */
export class PaginationWithWhereDto<
  T extends WhereInputBase = WhereInputBase,
> extends PaginationParamsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type((options) => {
    // 获取泛型类型
    return (options?.object as any)?.constructor?.whereType || WhereInputBase;
  })
  where?: T;
}
