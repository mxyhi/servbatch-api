import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { PaginationParamsDto } from '../dto/pagination-params.dto';
import { PaginationWithWhereDto } from '../dto/pagination-where.dto';

/**
 * 分页参数解析管道
 * 用于解析和验证分页参数，包括查询参数
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // 检查是否有where参数
    const hasWhereParam = value.where !== undefined;

    // 获取目标类型
    const metatype = metadata.metatype;

    // 如果目标类型是PaginationWithWhereDto的子类，并且有where参数
    if (hasWhereParam && metatype && this.isPaginationWithWhereDto(metatype)) {
      // 创建目标类型的实例
      const instance = new metatype();

      // 处理分页参数
      instance.page = value.page ? parseInt(value.page) : 1;
      instance.pageSize = value.pageSize ? parseInt(value.pageSize) : 10;

      // 这里不再需要处理日期范围和关键字搜索参数

      // 处理where参数
      if (typeof value.where === 'object') {
        // 创建where类型的实例
        const whereType = (metatype as any).whereType;
        if (whereType) {
          const whereInstance = new whereType();
          // 复制where参数
          Object.assign(whereInstance, value.where);
          instance.where = whereInstance;
        } else {
          // 如果没有指定whereType，直接使用原始对象
          instance.where = value.where;
        }
      }

      return instance;
    }

    // 如果不是PaginationWithWhereDto的子类，使用原来的逻辑
    const paginationParams = new PaginationParamsDto();

    // 处理分页参数
    paginationParams.page = value.page ? parseInt(value.page) : 1;
    paginationParams.pageSize = value.pageSize ? parseInt(value.pageSize) : 10;

    // 这里不再需要处理日期范围和关键字搜索参数

    return paginationParams;
  }

  /**
   * 检查类型是否是PaginationWithWhereDto的子类
   */
  private isPaginationWithWhereDto(metatype: any): boolean {
    return metatype.prototype instanceof PaginationWithWhereDto;
  }
}
