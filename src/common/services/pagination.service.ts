import { Injectable } from '@nestjs/common';
import { PaginationParamsDto } from '../dto/pagination-params.dto';
import { PaginationResultDto } from '../dto/pagination-result.dto';
import { SortOrder, PaginationDefaults } from '../constants';
import {
  WhereCondition,
  OrderByCondition,
  IncludeRelation,
} from '../types/utility-types';

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
  buildWhereClause<T extends Record<string, any>>(
    additionalWhere: WhereCondition<T> = {} as WhereCondition<T>,
  ): WhereCondition<T> {
    // 直接返回额外的查询条件，不再处理日期范围和关键字搜索
    return { ...additionalWhere };
  }

  /**
   * 构建排序条件
   * @param params 分页参数
   * @param defaultOrderBy 默认排序条件
   * @returns 构建的排序条件
   */
  buildOrderByClause<T extends Record<string, any>>(
    params: PaginationParamsDto,
    defaultOrderBy: OrderByCondition<T> = {} as OrderByCondition<T>,
  ): OrderByCondition<T> {
    // 如果没有指定排序字段，使用默认排序
    if (!params.sortField) {
      return defaultOrderBy;
    }

    // 构建排序条件
    const orderBy = {} as OrderByCondition<T>;
    orderBy[params.sortField as keyof T] =
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
  async paginateByLimit<T, M extends Record<string, any>>(
    model: {
      count: (args: { where: WhereCondition<M> }) => Promise<number>;
      findMany: (args: {
        where: WhereCondition<M>;
        orderBy: OrderByCondition<M>;
        include?: IncludeRelation<M>;
        skip: number;
        take: number;
      }) => Promise<T[]>;
    },
    params: PaginationParamsDto,
    where: WhereCondition<M> = {} as WhereCondition<M>,
    orderBy: OrderByCondition<M> = {} as OrderByCondition<M>,
    include: IncludeRelation<M> = {} as IncludeRelation<M>,
  ): Promise<PaginationResultDto<T>> {
    // 使用空值合并运算符确保有默认值
    const page = params.page ?? PaginationDefaults.PAGE;
    const pageSize = params.pageSize ?? PaginationDefaults.PAGE_SIZE;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const whereClause = this.buildWhereClause<M>(where);

    // 构建排序条件
    const orderByClause = this.buildOrderByClause<M>(params, orderBy);

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
  async paginate<T, M extends Record<string, any>>(
    model: {
      count: (args: { where: WhereCondition<M> }) => Promise<number>;
      findMany: (args: {
        where: WhereCondition<M>;
        orderBy: OrderByCondition<M>;
        include?: IncludeRelation<M>;
        skip: number;
        take: number;
      }) => Promise<T[]>;
    },
    params: PaginationParamsDto,
    where: WhereCondition<M> = {} as WhereCondition<M>,
    orderBy: OrderByCondition<M> = {} as OrderByCondition<M>,
    include: IncludeRelation<M> = {} as IncludeRelation<M>,
  ): Promise<PaginationResultDto<T>> {
    return this.paginateByLimit<T, M>(model, params, where, orderBy, include);
  }
}
