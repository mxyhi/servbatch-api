import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { PaginationParamsDto } from '../dto/pagination-params.dto';

/**
 * 分页参数解析管道
 * 用于解析和验证分页参数，包括查询参数
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: any, _metadata: ArgumentMetadata) {
    const paginationParams = new PaginationParamsDto();

    // 处理分页参数
    paginationParams.page = value.page ? parseInt(value.page) : 1;
    paginationParams.pageSize = value.pageSize ? parseInt(value.pageSize) : 10;

    // 处理日期范围参数
    if (value.createdAtStart) {
      paginationParams.createdAtStart = new Date(value.createdAtStart);
    }

    if (value.createdAtEnd) {
      paginationParams.createdAtEnd = new Date(value.createdAtEnd);
    }

    if (value.updatedAtStart) {
      paginationParams.updatedAtStart = new Date(value.updatedAtStart);
    }

    if (value.updatedAtEnd) {
      paginationParams.updatedAtEnd = new Date(value.updatedAtEnd);
    }

    // 处理关键字搜索
    if (value.keyword) {
      paginationParams.keyword = value.keyword;
    }

    return paginationParams;
  }
}
