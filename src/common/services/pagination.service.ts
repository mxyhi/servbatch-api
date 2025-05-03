import { Injectable } from '@nestjs/common';
import { PaginationParamsDto } from '../dto/pagination-params.dto';
import { PaginationResultDto } from '../dto/pagination-result.dto';

/**
 * 分页服务
 * 提供通用的分页方法
 */
@Injectable()
export class PaginationService {
  /**
   * 通用分页方法
   * @param model Prisma模型
   * @param params 分页参数
   * @param where 查询条件
   * @param orderBy 排序条件
   * @param include 关联查询
   * @returns 分页结果
   */
  /**
   * 构建查询条件
   * @param params 分页和查询参数
   * @param searchableFields 可搜索字段
   * @param additionalWhere 额外的查询条件
   * @returns 构建的查询条件
   */
  buildWhereClause(
    params: PaginationParamsDto,
    searchableFields: string[] = [],
    additionalWhere: any = {},
  ): any {
    const where: any = { ...additionalWhere };

    // 处理创建时间范围
    if (params.createdAtStart || params.createdAtEnd) {
      where.createdAt = where.createdAt || {};

      if (params.createdAtStart) {
        where.createdAt.gte = params.createdAtStart;
      }

      if (params.createdAtEnd) {
        where.createdAt.lte = params.createdAtEnd;
      }
    }

    // 处理更新时间范围
    if (params.updatedAtStart || params.updatedAtEnd) {
      where.updatedAt = where.updatedAt || {};

      if (params.updatedAtStart) {
        where.updatedAt.gte = params.updatedAtStart;
      }

      if (params.updatedAtEnd) {
        where.updatedAt.lte = params.updatedAtEnd;
      }
    }

    // 处理关键字搜索
    if (params.keyword && searchableFields.length > 0) {
      const keywordConditions = searchableFields.map((field) => ({
        [field]: {
          contains: params.keyword,
        },
      }));

      // 如果已经有OR条件，则合并
      if (where.OR) {
        where.OR = [...where.OR, ...keywordConditions];
      } else {
        where.OR = keywordConditions;
      }
    }

    return where;
  }

  /**
   * 通用分页方法
   * @param model Prisma模型
   * @param params 分页参数
   * @param where 查询条件
   * @param orderBy 排序条件
   * @param include 关联查询
   * @param searchableFields 可搜索字段（用于关键字搜索）
   * @returns 分页结果
   */
  async paginate<T>(
    model: any,
    params: PaginationParamsDto,
    where: any = {},
    orderBy: any = {},
    include: any = {},
    searchableFields: string[] = [],
  ): Promise<PaginationResultDto<T>> {
    // 使用空值合并运算符确保有默认值
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const whereClause = this.buildWhereClause(params, searchableFields, where);

    const [total, items] = await Promise.all([
      model.count({ where: whereClause }),
      model.findMany({
        where: whereClause,
        orderBy,
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
}
