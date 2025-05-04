import { Logger } from '@nestjs/common';

/**
 * 循环执行函数的选项接口
 */
export interface LoopRunOptions {
  /**
   * 循环执行的间隔时间（毫秒）
   */
  interval: number;

  /**
   * 任务名称，用于日志记录
   */
  taskName?: string;

  /**
   * 日志记录器实例
   */
  logger?: Logger;

  /**
   * 是否在任务执行失败时继续循环
   * @default true
   */
  continueOnError?: boolean;
}

/**
 * 循环执行函数
 * 使用setTimeout代替setInterval实现，防止任务堆积
 * 
 * @param task 要执行的异步任务函数
 * @param options 循环执行的选项
 * @returns 停止循环执行的函数
 */
export function loopRun(
  task: () => Promise<void>,
  options: LoopRunOptions,
): () => void {
  const {
    interval,
    taskName = '循环任务',
    logger,
    continueOnError = true,
  } = options;

  let isRunning = true;
  let timeoutId: NodeJS.Timeout | null = null;

  // 内部执行函数
  const execute = async () => {
    if (!isRunning) return;

    try {
      await task();
    } catch (error) {
      if (logger) {
        logger.error(
          `执行${taskName}失败: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }

      if (!continueOnError) {
        isRunning = false;
        return;
      }
    } finally {
      // 只有在仍然运行的情况下才安排下一次执行
      if (isRunning) {
        timeoutId = setTimeout(execute, interval);
      }
    }
  };

  // 立即开始第一次执行
  execute();

  // 返回停止函数
  return () => {
    isRunning = false;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (logger) {
      logger.log(`已停止${taskName}`);
    }
  };
}
