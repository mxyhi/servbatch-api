import { Injectable, Logger } from '@nestjs/common';
import { NodeSSH, Config, SSHExecCommandOptions } from 'node-ssh';
import { ServersService } from '../servers/servers.service';
import { ProxyGateway } from '../proxy/proxy.gateway';
import { Server } from '@prisma/client';

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);
  private sshConnections: Map<number, NodeSSH> = new Map();

  constructor(
    private readonly serversService: ServersService,
    private readonly proxyGateway: ProxyGateway,
  ) {}

  /**
   * 获取或创建到服务器的SSH连接
   *
   * 此方法首先检查是否已有到指定服务器的有效连接，如果有则返回该连接；
   * 如果没有或连接已断开，则创建新的连接。
   * 连接成功后会更新服务器状态为"online"，失败则更新为"offline"。
   *
   * @param serverId - 要连接的服务器ID
   * @returns 返回NodeSSH连接实例
   * @throws 如果连接失败，将抛出错误
   */
  async getConnection(serverId: number): Promise<NodeSSH> {
    // 检查是否已有连接
    if (this.sshConnections.has(serverId)) {
      const ssh = this.sshConnections.get(serverId);
      // 检查连接是否仍然有效
      try {
        if (ssh) {
          await ssh.execCommand('echo "Connection test"');
          return ssh;
        }
      } catch (error) {
        this.logger.warn(`SSH连接已断开，正在重新连接: ${error.message}`);
        // 连接已断开，需要重新连接
        this.sshConnections.delete(serverId);
      }
    }

    // 获取服务器信息
    const server = await this.serversService.findOne(serverId);

    // 创建SSH配置
    const config: Config = {
      host: server.host,
      port: server.port,
      username: server.username,
    };

    // 设置认证方式
    if (server.password) {
      config.password = server.password;
    } else if (server.privateKey) {
      config.privateKey = server.privateKey;
    } else {
      throw new Error('未提供密码或私钥');
    }

    // 创建新连接
    const ssh = new NodeSSH();
    try {
      await ssh.connect(config);
      this.logger.log(`[getConnection] 成功连接到服务器 ${serverId}`);
      this.sshConnections.set(serverId, ssh);
      await this.serversService.updateStatus(serverId, 'online');
      return ssh;
    } catch (error) {
      this.logger.error(
        `[getConnection] 连接服务器 ${serverId} 失败: ${error.message}`,
        error.stack,
      );
      await this.serversService.updateStatus(serverId, 'offline');
      throw new Error(
        `无法连接到服务器 ${server.host}:${server.port}: ${error.message}`,
      );
    }
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
  async testConnection(
    serverId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 获取服务器信息
      const server = await this.serversService.findOne(serverId);

      // 根据连接类型选择测试方式
      if (server.connectionType === 'proxy' && server.proxyId) {
        // 通过代理测试连接
        const result = await this.executeCommandViaProxy(
          server,
          'echo "Connection successful"',
          10, // 10秒超时
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
      } else {
        // 直接SSH连接测试
        const ssh = await this.getConnection(serverId);
        const result = await ssh.execCommand('echo "Connection successful"');
        return {
          success: true,
          message: `连接成功: ${result.stdout}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error.message}`,
      };
    }
  }

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
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    // 获取服务器信息
    const server = await this.serversService.findOne(serverId);

    // 检查服务器连接类型
    if (server.connectionType === 'proxy' && server.proxyId) {
      return this.executeCommandViaProxy(server, command, timeout);
    } else {
      // 原有的直接SSH连接方式
      const ssh = await this.getConnection(serverId);
      try {
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
        this.logger.error(`执行命令失败: ${error.message}`);
        return {
          stdout: '',
          stderr: error.message,
          exitCode: 1,
        };
      }
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
   * @throws 如果代理未连接或命令执行失败，将抛出错误
   */
  private async executeCommandViaProxy(
    server: Server, // 使用Prisma生成的Server类型
    command: string,
    timeout?: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
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
    const commandObj = {
      commandId,
      serverId: server.id,
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password,
      privateKey: server.privateKey,
      command,
      timeout: timeout ? timeout * 1000 : undefined, // 将秒转换为毫秒
    };

    try {
      // 此时我们已经确认了server.proxyId不为null
      const proxyId = server.proxyId as string;

      // 直接调用并等待 ProxyGateway 返回的 Promise
      const result = await this.proxyGateway.sendCommand(
        proxyId,
        commandObj, // commandObj 包含 commandId 和 timeout
      );
      this.logger.log(
        `[executeCommandViaProxy] 成功收到代理 ${proxyId} 对命令 ${commandId} 的结果`,
      );
      return result;
    } catch (error) {
      // 确保error是Error类型
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `[executeCommandViaProxy] 通过代理 ${server.proxyId} 执行命令 ${commandId} 失败: ${err.message}`,
        err.stack,
      );
      // 返回标准错误结构
      return {
        stdout: '',
        stderr: err.message,
        exitCode: 1, // 或者根据错误类型设置不同的退出码
      };
    }
  }

  /**
   * 关闭到指定服务器的SSH连接
   *
   * 此方法关闭并清理到指定服务器的SSH连接。
   *
   * @param serverId - 要关闭连接的服务器ID
   */
  async closeConnection(serverId: number): Promise<void> {
    if (this.sshConnections.has(serverId)) {
      const ssh = this.sshConnections.get(serverId);
      if (ssh) {
        ssh.dispose();
        this.sshConnections.delete(serverId);
      }
    }
  }

  /**
   * 关闭所有SSH连接
   *
   * 此方法关闭并清理所有活动的SSH连接，通常在应用关闭时调用。
   */
  async closeAllConnections(): Promise<void> {
    for (const [serverId, ssh] of this.sshConnections.entries()) {
      if (ssh) {
        ssh.dispose();
        this.sshConnections.delete(serverId);
      }
    }
  }
}
