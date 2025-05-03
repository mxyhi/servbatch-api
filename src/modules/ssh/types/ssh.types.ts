/**
 * SSH 命令执行结果类型
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * SSH 连接测试结果类型
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

/**
 * 通过代理执行命令的参数类型
 */
export interface ProxyCommandOptions {
  commandId: string;
  serverId: number;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  command: string;
  timeout?: number; // 毫秒
}
