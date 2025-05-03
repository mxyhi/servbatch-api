import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

/**
 * 分页参数解析管道
 * 用于解析和验证分页参数，包括查询参数
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // 获取目标类型
    const metatype = metadata.metatype;

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // 创建目标类型的实例
    const instance = plainToInstance(metatype, value);

    // 确保分页参数是数字类型
    if (instance.page) {
      instance.page = parseInt(instance.page.toString());
    } else {
      instance.page = 1;
    }

    if (instance.pageSize) {
      instance.pageSize = parseInt(instance.pageSize.toString());
    } else {
      instance.pageSize = 10;
    }

    return instance;
  }

  /**
   * 检查类型是否需要验证
   */
  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
