import { Injectable, Logger } from '@nestjs/common';
import { NodeSSH, Config, SSHExecCommandOptions } from 'node-ssh';
import { ServersService } from '../servers/servers.service';
import { ProxyGateway } from '../proxy/proxy.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class SshService {
  private readonly logger = new Logger(SshService.name);
  private sshConnections: Map<number, NodeSSH> = new Map();
  private commandResults: Map<string, any> = new Map();

  constructor(
    private readonly serversService: ServersService,
    private readonly proxyGateway: ProxyGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // 监听命令执行结果事件
    this.eventEmitter.on('command_result', (data: any) => {
      const { commandId, result } = data;
      this.commandResults.set(commandId, result);
      // 触发一个事件，通知等待结果的Promise
      this.eventEmitter.emit(`command_result_${commandId}`, result);
    });
  }

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
      this.sshConnections.set(serverId, ssh);
      await this.serversService.updateStatus(serverId, 'online');
      return ssh;
    } catch (error) {
      await this.serversService.updateStatus(serverId, 'offline');
      throw new Error(`无法连接到服务器: ${error.message}`);
    }
  }

  async testConnection(
    serverId: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const ssh = await this.getConnection(serverId);
      const result = await ssh.execCommand('echo "Connection successful"');
      return {
        success: true,
        message: `连接成功: ${result.stdout}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `连接失败: ${error.message}`,
      };
    }
  }

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
          timeoutId = setTimeout(() => {
            this.logger.warn(`命令执行超时 (${timeout}ms)`);
          }, timeout);
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

  // 通过代理执行命令
  private async executeCommandViaProxy(
    server: any, // 使用any类型暂时绕过类型检查
    command: string,
    timeout?: number,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
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
      timeout,
    };

    // 发送命令到代理
    const sent = await this.proxyGateway.sendCommand(
      server.proxyId,
      commandObj,
    );
    if (!sent) {
      return {
        stdout: '',
        stderr: `无法发送命令到代理 ${server.proxyId}`,
        exitCode: 1,
      };
    }

    // 等待命令执行结果
    return new Promise<{ stdout: string; stderr: string; exitCode: number }>(
      (resolve, reject) => {
        const maxWaitTime = timeout || 30000; // 默认30秒超时
        const timeoutId = setTimeout(() => {
          this.eventEmitter.removeAllListeners(`command_result_${commandId}`);
          reject(new Error(`命令执行超时 (${maxWaitTime}ms)`));
        }, maxWaitTime);

        // 设置结果监听器
        this.eventEmitter.once(`command_result_${commandId}`, (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        });
      },
    ).catch((error) => {
      this.logger.error(`通过代理执行命令失败: ${error.message}`);
      return {
        stdout: '',
        stderr: error.message,
        exitCode: 1,
      };
    });
  }

  async closeConnection(serverId: number): Promise<void> {
    if (this.sshConnections.has(serverId)) {
      const ssh = this.sshConnections.get(serverId);
      if (ssh) {
        ssh.dispose();
        this.sshConnections.delete(serverId);
      }
    }
  }

  async closeAllConnections(): Promise<void> {
    for (const [serverId, ssh] of this.sshConnections.entries()) {
      if (ssh) {
        ssh.dispose();
        this.sshConnections.delete(serverId);
      }
    }
  }
}
