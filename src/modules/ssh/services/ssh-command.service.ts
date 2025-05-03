import { Injectable, Logger } from '@nestjs/common';
import { SSHExecCommandOptions } from 'node-ssh';
import { Server } from '@prisma/client';
import { SshConnectionService } from './ssh-connection.service';
import { ProxyGateway } from '../../proxy/proxy.gateway';
import { CommandResult, ProxyCommandOptions } from '../types/ssh.types';
import { ErrorHandler } from '../../../common/utils/error-handler.util';
import { ServersService } from '../../servers/servers.service';

/**
 * SSH命令服务
 * 负责在服务器上执行命令，支持直接SSH连接和通过代理执行
 */
@Injectable()
export class SshCommandService {
  private readonly logger = new Logger(SshCommandService.name);

  constructor(
    private readonly sshConnectionService: SshConnectionService,
    private readonly proxyGateway: ProxyGateway,
    private readonly serversService: ServersService,
  ) {}

  /**
   * 在指定服务器上执行命令
   *
   * 根据服务器的连接类型，选择直接SSH连接或通过代理执行命令。
   * 如果服务器配置为直接连接，将使用SSH连接执行命令；
   * 如果服务器配置为通过代理连接，将调用executeCommandViaProxy方法。
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
    server?: Server,
  ): Promise<CommandResult> {
    // 如果没有提供server对象，则获取服务器信息
    const serverInfo = server || (await this.getServerById(serverId));

    // 检查服务器连接类型
    if (serverInfo.connectionType === 'proxy' && serverInfo.proxyId) {
      return this.executeCommandViaProxy(serverInfo, command, timeout);
    } else {
      return this.executeCommandViaSSH(serverId, command, timeout);
    }
  }

  /**
   * 通过直接SSH连接执行命令
   *
   * @param serverId - 服务器ID
   * @param command - 要执行的命令
   * @param timeout - 命令执行超时时间（秒）
   * @returns 命令执行结果
   */
  private async executeCommandViaSSH(
    serverId: number,
    command: string,
    timeout?: number,
  ): Promise<CommandResult> {
    try {
      const ssh = await this.sshConnectionService.getConnection(serverId);

      const options: SSHExecCommandOptions = {
        cwd: '/',
      };

      // 如果提供了超时时间，添加自定义处理
      let timeoutId: NodeJS.Timeout | undefined;
      if (timeout) {
        const timeoutMs = timeout * 1000; // 将秒转换为毫秒
        timeoutId = setTimeout(() => {
          this.logger.warn(`命令执行超时 (${timeout}秒)`);
        }, timeoutMs);
      }

      const result = await ssh.execCommand(command, options);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.code || 0,
      };
    } catch (error) {
      const err = ErrorHandler.handleError(this.logger, error, `执行命令失败`);

      return {
        stdout: '',
        stderr: err.message,
        exitCode: 1,
      };
    }
  }

  /**
   * 通过代理执行命令
   *
   * 此方法用于通过中介代理服务执行SSH命令，适用于无法直接访问的内网服务器。
   * 命令将被发送到指定的代理服务，由代理服务连接目标服务器并执行命令，然后返回结果。
   *
   * @param server - 目标服务器信息，必须包含connectionType='proxy'和有效的proxyId
   * @param command - 要在目标服务器上执行的命令
   * @param timeout - 命令执行超时时间（秒），如果不提供则使用默认值（30秒）
   * @returns 包含命令执行结果的对象，包括标准输出、标准错误和退出码
   */
  private async executeCommandViaProxy(
    server: Server,
    command: string,
    timeout?: number,
  ): Promise<CommandResult> {
    // 确保proxyId存在
    if (!server.proxyId) {
      return {
        stdout: '',
        stderr: '服务器未配置代理ID',
        exitCode: 1,
      };
    }

    // 检查代理是否在线
    if (!this.proxyGateway.isProxyOnline(server.proxyId)) {
      return {
        stdout: '',
        stderr: `代理 ${server.proxyId} 未连接`,
        exitCode: 1,
      };
    }

    // 生成唯一的命令ID
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // 创建命令对象
    const commandObj: ProxyCommandOptions = {
      commandId,
      serverId: server.id,
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password || undefined, // 将 null 转换为 undefined
      privateKey: server.privateKey || undefined, // 将 null 转换为 undefined
      command,
      timeout: timeout ? timeout * 1000 : undefined, // 将秒转换为毫秒
    };

    try {
      // 此时我们已经确认了server.proxyId不为null
      const proxyId = server.proxyId as string;

      // 直接调用并等待 ProxyGateway 返回的 Promise
      const result = await this.proxyGateway.sendCommand(proxyId, commandObj);
      this.logger.log(
        `[executeCommandViaProxy] 成功收到代理 ${proxyId} 对命令 ${commandId} 的结果`,
      );
      return result;
    } catch (error) {
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `[executeCommandViaProxy] 通过代理 ${server.proxyId} 执行命令 ${commandId} 失败`,
      );

      return {
        stdout: '',
        stderr: err.message,
        exitCode: 1,
      };
    }
  }

  /**
   * 获取服务器信息
   *
   * 从ServersService获取服务器信息
   *
   * @param serverId 服务器ID
   * @returns 服务器信息
   */
  private async getServerById(serverId: number): Promise<Server> {
    return this.serversService.findOne(serverId);
  }
}
