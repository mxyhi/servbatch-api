import {
  Body,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  applyDecorators,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ParsePaginationPipe } from '../pipes/parse-pagination.pipe';
import { PaginationResultDto } from '../dto/pagination-result.dto';
import { BaseService } from '../services/base.service';

/**
 * API装饰器工厂函数
 */
function ApiDecorators(options: {
  summary: string;
  entityName: string;
  operation: 'create' | 'findAll' | 'findOne' | 'update' | 'delete';
}) {
  const { summary, entityName, operation } = options;

  switch (operation) {
    case 'create':
      return applyDecorators(
        ApiOperation({ summary: `创建${entityName}` }),
        ApiResponse({
          status: 201,
          description: `${entityName}创建成功`,
        }),
      );
    case 'findAll':
      return applyDecorators(
        ApiOperation({ summary: `分页获取${entityName}列表` }),
        ApiResponse({
          status: 200,
          description: `返回分页的${entityName}列表`,
        }),
      );
    case 'findOne':
      return applyDecorators(
        ApiOperation({ summary: `获取指定${entityName}` }),
        ApiParam({ name: 'id', description: `${entityName}ID` }),
        ApiResponse({
          status: 200,
          description: `返回指定${entityName}`,
        }),
        ApiResponse({ status: 404, description: `${entityName}不存在` }),
      );
    case 'update':
      return applyDecorators(
        ApiOperation({ summary: `更新${entityName}` }),
        ApiParam({ name: 'id', description: `${entityName}ID` }),
        ApiResponse({
          status: 200,
          description: `${entityName}更新成功`,
        }),
        ApiResponse({ status: 404, description: `${entityName}不存在` }),
      );
    case 'delete':
      return applyDecorators(
        ApiOperation({ summary: `删除${entityName}` }),
        ApiParam({ name: 'id', description: `${entityName}ID` }),
        ApiResponse({
          status: 200,
          description: `${entityName}删除成功`,
        }),
        ApiResponse({ status: 404, description: `${entityName}不存在` }),
      );
  }
}

/**
 * 通用基础控制器类
 * 提供常见的CRUD操作路由
 *
 * @template T - 实体类型
 * @template CreateDto - 创建DTO类型
 * @template UpdateDto - 更新DTO类型
 * @template QueryDto - 查询DTO类型
 * @template Service - 服务类型，必须扩展自BaseService
 */
export abstract class BaseController<
  T,
  CreateDto extends Record<string, any>,
  UpdateDto extends Partial<Record<string, any>>,
  QueryDto extends Record<string, any>,
  Service extends BaseService<T, CreateDto, UpdateDto, QueryDto>,
> {
  protected abstract readonly entityName: string;

  constructor(protected readonly service: Service) {}

  /**
   * 创建实体
   * @param createDto 创建DTO
   * @returns 创建的实体
   */
  @Post()
  @ApiDecorators({
    summary: '创建实体',
    entityName: '', // 将在子类中通过装饰器覆盖
    operation: 'create',
  })
  create(@Body() createDto: CreateDto) {
    return this.service.create(createDto);
  }

  /**
   * 分页查询实体
   * @param params 查询参数
   * @returns 分页结果
   */
  @Get()
  @ApiDecorators({
    summary: '分页查询实体',
    entityName: '',
    operation: 'findAll',
  })
  findByLimit(@Query(ParsePaginationPipe) params: QueryDto) {
    return this.service.findByLimit(params);
  }

  /**
   * 根据ID查询实体
   * @param id 实体ID
   * @returns 实体
   */
  @Get(':id')
  @ApiDecorators({
    summary: '查询指定实体',
    entityName: '',
    operation: 'findOne',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /**
   * 更新实体
   * @param id 实体ID
   * @param updateDto 更新DTO
   * @returns 更新后的实体
   */
  @Patch(':id')
  @ApiDecorators({
    summary: '更新实体',
    entityName: '',
    operation: 'update',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateDto) {
    return this.service.update(id, updateDto);
  }

  /**
   * 删除实体
   * @param id 实体ID
   * @returns 删除的实体
   */
  @Delete(':id')
  @ApiDecorators({
    summary: '删除实体',
    entityName: '',
    operation: 'delete',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
