import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { PaginationParamsDto } from '../dto/pagination-params.dto';

/**
 * 分页参数解析管道
 * 用于解析和验证分页参数
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const paginationParams = new PaginationParamsDto();
    paginationParams.page = value.page ? parseInt(value.page) : 1;
    paginationParams.pageSize = value.pageSize ? parseInt(value.pageSize) : 10;
    return paginationParams;
  }
}
