import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { buildDateRangeFilter, DateField } from '../types/date-range.type';

/**
 * 清理操作结果类型
 */
export interface CleanupResult {
  deletedCount: number;
  success: boolean;
  message: string;
}

/**
 * 清理操作工具类
 * 提供通用的数据清理功能
 */
export class CleanupUtil {
  /**
   * 根据日期范围清理数据
   * @param prisma Prisma客户端
   * @param model 模型名称
   * @param dateField 日期字段名
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param additionalWhere 额外的查询条件
   * @param logger 日志记录器
   * @param logPrefix 日志前缀
   * @returns 清理结果
   */
  static async cleanupByDateRange<T extends Record<string, any>>(
    prisma: PrismaClient,
    model: keyof PrismaClient,
    dateField: DateField,
    startDate?: Date,
    endDate?: Date,
    additionalWhere: Record<string, any> = {},
    logger?: Logger,
    logPrefix = '记录',
  ): Promise<CleanupResult> {
    try {
      // 构建日期范围过滤条件
      const dateFilter = buildDateRangeFilter<T>(dateField, startDate, endDate);
      
      // 合并查询条件
      const where = {
        ...dateFilter,
        ...additionalWhere,
      };
      
      // 执行删除操作
      const { count } = await (prisma[model] as any).deleteMany({ where });
      
      // 记录日志
      if (logger) {
        logger.log(`已清理 ${count} 条${logPrefix}`);
      }
      
      return {
        deletedCount: count,
        success: true,
        message: `已成功清理 ${count} 条${logPrefix}`,
      };
    } catch (error) {
      // 记录错误日志
      if (logger) {
        logger.error(`清理${logPrefix}失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      return {
        deletedCount: 0,
        success: false,
        message: `清理失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
