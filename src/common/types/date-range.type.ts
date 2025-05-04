import { DateFieldType, DateField } from '../constants';

/**
 * 日期范围过滤器类型
 * 用于构建基于日期范围的数据库查询条件
 */
export interface DateRangeFilter {
  gte?: Date; // 大于等于
  lte?: Date; // 小于等于
}

/**
 * 构建日期范围查询条件
 * @param field 日期字段名
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 构建的查询条件对象
 */
export function buildDateRangeFilter<T extends Record<string, any>>(
  field: DateFieldType,
  startDate?: Date,
  endDate?: Date,
): Partial<T> {
  if (!startDate && !endDate) {
    return {} as Partial<T>;
  }

  const filter = {} as Record<string, DateRangeFilter>;
  const dateFilter: DateRangeFilter = {};

  if (startDate) {
    dateFilter.gte = startDate;
  }

  if (endDate) {
    dateFilter.lte = endDate;
  }

  filter[field] = dateFilter;
  return filter as Partial<T>;
}
