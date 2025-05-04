import { Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationResultDto, PaginationService } from '../../common';
import { PaginationParamsDto } from '../dto/pagination-params.dto';
import { ErrorHandler } from '../utils/error-handler.util';
import { PrismaModel, WhereCondition } from '../types/utility-types';

/**
 * 通用基础服务类
 * 提供常见的CRUD操作和分页查询功能
 *
 * @template T - 实体类型
 * @template CreateDto - 创建DTO类型
 * @template UpdateDto - 更新DTO类型
 * @template QueryDto - 查询DTO类型，扩展自PaginationParamsDto
 */
export abstract class BaseService<
  T extends Record<string, unknown>,
  CreateDto extends Record<string, unknown>,
  UpdateDto extends Partial<Record<string, unknown>>,
  QueryDto extends PaginationParamsDto,
> {
  protected abstract readonly logger: Logger;
  protected abstract readonly modelName: string;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly paginationService: PaginationService,
  ) {}

  /**
   * 获取Prisma模型
   */
  protected abstract getModel(): PrismaModel<T>;

  /**
   * 构建查询条件
   * @param params 查询参数
   * @returns 查询条件
   */
  protected abstract buildWhereClause(params: QueryDto): WhereCondition<T>;

  /**
   * 创建实体
   * @param createDto 创建DTO
   * @returns 创建的实体
   */
  async create(createDto: CreateDto): Promise<T> {
    try {
      return await this.getModel().create({
        data: createDto,
      });
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `创建${this.modelName}失败`,
      );
      throw err;
    }
  }

  /**
   * 分页查询实体
   * @param params 查询参数
   * @returns 分页结果
   */
  async findByLimit(
    params: QueryDto = { page: 1, pageSize: 10 } as QueryDto,
  ): Promise<PaginationResultDto<T>> {
    try {
      // 构建查询条件
      const where = this.buildWhereClause(params);

      // 使用分页服务进行查询
      // 使用类型断言确保类型兼容性
      return this.paginationService.paginateByLimit<T, any>(
        this.getModel(),
        params,
        where as any,
        { createdAt: 'desc' },
        {},
      );
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `分页查询${this.modelName}失败`,
      );
      throw err;
    }
  }

  /**
   * 分页查询实体（别名，保持向后兼容）
   * @deprecated 请使用 findByLimit 方法
   */
  async findAll(
    params: QueryDto = { page: 1, pageSize: 10 } as QueryDto,
  ): Promise<PaginationResultDto<T>> {
    return this.findByLimit(params);
  }

  /**
   * 根据ID查询实体
   * @param id 实体ID
   * @returns 实体
   */
  async findOne(id: number): Promise<T> {
    try {
      const entity = await this.getModel().findUnique({
        where: { id },
      });

      if (!entity) {
        throw new NotFoundException(`${this.modelName}ID ${id} 不存在`);
      }

      return entity;
    } catch (error) {
      // 如果已经是NotFoundException，则直接抛出
      if (error instanceof NotFoundException) {
        throw error;
      }

      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `查询${this.modelName}失败`,
      );
      throw err;
    }
  }

  /**
   * 更新实体
   * @param id 实体ID
   * @param updateDto 更新DTO
   * @returns 更新后的实体
   */
  async update(id: number, updateDto: UpdateDto): Promise<T> {
    try {
      // 先检查实体是否存在
      await this.findOne(id);

      return await this.getModel().update({
        where: { id },
        data: updateDto,
      });
    } catch (error) {
      // 如果已经是NotFoundException，则直接抛出
      if (error instanceof NotFoundException) {
        throw error;
      }

      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `更新${this.modelName}失败`,
      );
      throw err;
    }
  }

  /**
   * 删除实体
   * @param id 实体ID
   */
  async remove(id: number): Promise<T> {
    try {
      // 先检查实体是否存在
      await this.findOne(id);

      return await this.getModel().delete({
        where: { id },
      });
    } catch (error) {
      // 如果已经是NotFoundException，则直接抛出
      if (error instanceof NotFoundException) {
        throw error;
      }

      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `删除${this.modelName}失败`,
      );
      throw err;
    }
  }
}
