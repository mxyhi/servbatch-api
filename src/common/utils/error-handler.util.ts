import {
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  DATABASE = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

/**
 * 错误上下文接口
 */
export interface ErrorContext {
  operation: string;
  entity?: string;
  entityId?: number | string;
  additionalInfo?: Record<string, any>;
}

/**
 * 错误处理工具类
 * 提供统一的错误处理和日志记录功能
 */
export class ErrorHandler {
  /**
   * 处理错误并记录日志
   * @param logger Logger实例
   * @param error 捕获的错误
   * @param context 错误上下文描述
   * @returns 标准化的错误对象
   */
  static handleError(
    logger: Logger,
    error: unknown,
    context: string,
    errorContext?: ErrorContext,
  ): Error {
    // 确保error是Error类型
    const err = error instanceof Error ? error : new Error(String(error));

    // 确定错误类型
    const errorType = this.classifyError(error);

    // 构建详细的日志消息
    const contextInfo = errorContext
      ? ` [操作: ${errorContext.operation}${errorContext.entity ? `, 实体: ${errorContext.entity}` : ''}${errorContext.entityId ? `, ID: ${errorContext.entityId}` : ''}]`
      : '';

    // 记录错误日志
    logger.error(
      `${context}${contextInfo} [${errorType}]: ${err.message}`,
      err.stack,
    );

    // 转换为合适的HTTP异常
    return this.convertToHttpException(err, errorType);
  }

  /**
   * 分类错误类型
   * @param error 错误对象
   * @returns 错误类型
   */
  private static classifyError(error: unknown): ErrorType {
    if (error instanceof NotFoundException) {
      return ErrorType.NOT_FOUND;
    }

    if (error instanceof ConflictException) {
      return ErrorType.CONFLICT;
    }

    if (error instanceof BadRequestException) {
      return ErrorType.VALIDATION;
    }

    // Prisma错误
    if (error instanceof PrismaClientKnownRequestError) {
      // 处理Prisma的特定错误代码
      switch (error.code) {
        case 'P2002': // 唯一约束失败
          return ErrorType.CONFLICT;
        case 'P2025': // 记录不存在
          return ErrorType.NOT_FOUND;
        case 'P2001': // 记录查找失败
        case 'P2003': // 外键约束失败
        case 'P2004': // 数据库约束失败
        default:
          return ErrorType.DATABASE;
      }
    }

    // 网络错误检测
    if (
      error instanceof Error &&
      (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('network error'))
    ) {
      return ErrorType.NETWORK;
    }

    // 超时错误检测
    if (error instanceof Error && error.message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 将错误转换为适当的HTTP异常
   * @param error 原始错误
   * @param errorType 错误类型
   * @returns HTTP异常
   */
  private static convertToHttpException(
    error: Error,
    errorType: ErrorType,
  ): Error {
    // 如果已经是HTTP异常，则直接返回
    if (error instanceof HttpException) {
      return error;
    }

    // 根据错误类型转换为HTTP异常
    switch (errorType) {
      case ErrorType.NOT_FOUND:
        return new NotFoundException(error.message);
      case ErrorType.CONFLICT:
        return new ConflictException(error.message);
      case ErrorType.VALIDATION:
        return new BadRequestException(error.message);
      case ErrorType.DATABASE:
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
      case ErrorType.UNKNOWN:
      default:
        return new InternalServerErrorException(error.message);
    }
  }

  /**
   * 创建标准化的错误响应
   * @param error 错误对象或消息
   * @param errorContext 错误上下文
   * @returns 包含错误信息的对象
   */
  static createErrorResponse<T extends Record<string, any>>(
    error: unknown,
    additionalData: Partial<T> = {} as Partial<T>,
    errorContext?: ErrorContext,
  ): T & {
    success: false;
    message: string;
    errorType: string;
    context?: ErrorContext;
  } {
    const message = error instanceof Error ? error.message : String(error);
    const errorType = this.classifyError(error);

    return {
      success: false,
      message,
      errorType,
      ...(errorContext && { context: errorContext }),
      ...additionalData,
    } as T & {
      success: false;
      message: string;
      errorType: string;
      context?: ErrorContext;
    };
  }
}
