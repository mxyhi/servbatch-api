import { Logger } from '@nestjs/common';

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
  ): Error {
    // 确保error是Error类型
    const err = error instanceof Error ? error : new Error(String(error));
    
    // 记录错误日志
    logger.error(`${context}: ${err.message}`, err.stack);
    
    return err;
  }

  /**
   * 创建标准化的错误响应
   * @param error 错误对象或消息
   * @returns 包含错误信息的对象
   */
  static createErrorResponse<T extends Record<string, any>>(
    error: unknown,
    additionalData: Partial<T> = {} as Partial<T>,
  ): T & { success: false; message: string } {
    const message = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      message,
      ...additionalData,
    } as T & { success: false; message: string };
  }
}
