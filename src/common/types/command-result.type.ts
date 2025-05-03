/**
 * 命令执行结果类型
 * 用于统一表示命令执行的结果
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * 操作结果类型
 * 用于统一表示操作的成功/失败状态和消息
 */
export interface OperationResult {
  success: boolean;
  message: string;
}

/**
 * 创建成功的操作结果
 * @param message 成功消息
 * @returns 操作结果对象
 */
export function createSuccessResult(message: string): OperationResult {
  return {
    success: true,
    message,
  };
}

/**
 * 创建失败的操作结果
 * @param message 失败消息
 * @returns 操作结果对象
 */
export function createErrorResult(message: string): OperationResult {
  return {
    success: false,
    message,
  };
}
