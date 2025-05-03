import { Injectable, Logger } from '@nestjs/common';
import { NodeSSH } from 'node-ssh';
import { ServersService } from '../servers/servers.service';
import { SshConnectionService } from './services/ssh-connection.service';
import { SshCommandService } from './services/ssh-command.service';
import { CommandResult, ConnectionTestResult } from './types/ssh.types';
import { ErrorHandler } from '../../common/utils/error-handler.util';

/**
 * SSH服务
 * 作为外观模式（Facade）协调SSH连接和命令执行
 */
@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);

  constructor(
    private readonly serversService: ServersService,
    private readonly sshConnectionService: SshConnectionService,
    private readonly sshCommandService: SshCommandService,
  ) {}

  /**
   * 获取或创建到服务器的SSH连接
   *
   * 委托给SshConnectionService处理
   *
   * @param serverId - 要连接的服务器ID
   * @returns 返回NodeSSH连接实例
   * @throws 如果连接失败，将抛出错误
   */
  async getConnection(serverId: number): Promise<NodeSSH> {
    return this.sshConnectionService.getConnection(serverId);
  }

  /**
   * 测试与服务器的连接
   *
   * 根据服务器的连接类型，选择直接SSH连接或通过代理测试连接。
   * 如果连接成功，将更新服务器状态为"online"；
   * 如果连接失败，将更新服务器状态为"offline"。
   *
   * @param serverId - 要测试连接的服务器ID
   * @returns 包含测试结果的对象，包括成功/失败状态和消息
   */
  async testConnection(serverId: number): Promise<ConnectionTestResult> {
    try {
      // 获取服务器信息
      const server = await this.serversService.findOne(serverId);

      // 执行测试命令
      const result = await this.sshCommandService.executeCommand(
        serverId,
        'echo "Connection successful"',
        10, // 10秒超时
        server,
      );

      if (result.exitCode === 0) {
        await this.serversService.updateStatus(serverId, 'online');
        return {
          success: true,
          message: `连接成功: ${result.stdout}`,
        };
      } else {
        await this.serversService.updateStatus(serverId, 'offline');
        return {
          success: false,
          message: `连接失败: ${result.stderr || '未知错误'}`,
        };
      }
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `测试连接服务器 ${serverId} 失败`,
      );

      return {
        success: false,
        message: `连接失败: ${err.message}`,
      };
    }
  }

  /**
   * 在指定服务器上执行命令
   *
   * 委托给SshCommandService处理
   *
   * @param serverId - 服务器ID
   * @param command - 要执行的命令
   * @param timeout - 命令执行超时时间（秒），如果不提供则使用默认值
   * @returns 包含命令执行结果的对象，包括标准输出、标准错误和退出码
   */
  async executeCommand(
    serverId: number,
    command: string,
    timeout?: number,
  ): Promise<CommandResult> {
    return this.sshCommandService.executeCommand(serverId, command, timeout);
  }

  /**
   * 关闭到指定服务器的SSH连接
   *
   * 委托给SshConnectionService处理
   *
   * @param serverId - 要关闭连接的服务器ID
   */
  async closeConnection(serverId: number): Promise<void> {
    return this.sshConnectionService.closeConnection(serverId);
  }

  /**
   * 关闭所有SSH连接
   *
   * 委托给SshConnectionService处理
   */
  async closeAllConnections(): Promise<void> {
    return this.sshConnectionService.closeAllConnections();
  }
}
