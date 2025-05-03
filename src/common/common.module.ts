import { Module } from '@nestjs/common';
import { PaginationService } from './services/pagination.service';

/**
 * 通用模块
 * 包含分页服务等通用组件
 */
@Module({
  providers: [PaginationService],
  exports: [PaginationService],
})
export class CommonModule {}
