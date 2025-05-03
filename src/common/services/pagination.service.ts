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
  async paginate<T>(
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

    const [total, items] = await Promise.all([
      model.count({ where }),
      model.findMany({
        where,
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
