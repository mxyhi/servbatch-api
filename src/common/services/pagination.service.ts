import { Injectable } from '@nestjs/common';
import { PaginationParamsDto, SortOrder } from '../dto/pagination-params.dto';
import { PaginationResultDto } from '../dto/pagination-result.dto';

/**
 * 分页服务
 * 提供通用的分页方法
 */
@Injectable()
export class PaginationService {
  /**
   * 构建查询条件
   * @param additionalWhere 额外的查询条件
   * @returns 构建的查询条件
   */
  buildWhereClause(additionalWhere: any = {}): any {
    // 直接返回额外的查询条件，不再处理日期范围和关键字搜索
    return { ...additionalWhere };
  }

  /**
   * 构建排序条件
   * @param params 分页参数
   * @param defaultOrderBy 默认排序条件
   * @returns 构建的排序条件
   */
  buildOrderByClause(
    params: PaginationParamsDto,
    defaultOrderBy: any = {},
  ): any {
    // 如果没有指定排序字段，使用默认排序
    if (!params.sortField) {
      return defaultOrderBy;
    }

    // 构建排序条件
    const orderBy = {};
    orderBy[params.sortField] =
      params.sortOrder === SortOrder.ASCEND ? 'asc' : 'desc';
    return orderBy;
  }

  /**
   * 通用分页查询方法
   * @param model Prisma模型
   * @param params 分页参数
   * @param where 查询条件
   * @param orderBy 默认排序条件
   * @param include 关联查询
   * @returns 分页结果
   */
  async paginateByLimit<T>(
    model: any,
    params: PaginationParamsDto,
    where: any = {},
    orderBy: any = {},
    include: any = {},
  ): Promise<PaginationResultDto<T>> {
    // 使用空值合并运算符确保有默认值
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const whereClause = this.buildWhereClause(where);

    // 构建排序条件
    const orderByClause = this.buildOrderByClause(params, orderBy);

    const [total, items] = await Promise.all([
      model.count({ where: whereClause }),
      model.findMany({
        where: whereClause,
        orderBy: orderByClause,
        include,
        skip,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      total,
      page,
      pageSize,
      totalPages,
      items,
    };
  }

  /**
   * 通用分页方法（别名，保持向后兼容）
   * @deprecated 请使用 paginateByLimit 方法
   */
  async paginate<T>(
    model: any,
    params: PaginationParamsDto,
    where: any = {},
    orderBy: any = {},
    include: any = {},
  ): Promise<PaginationResultDto<T>> {
    return this.paginateByLimit<T>(model, params, where, orderBy, include);
  }
}
