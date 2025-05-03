import { Injectable, Logger } from '@nestjs/common';
import { NodeSSH, Config } from 'node-ssh';
import { ServersService } from '../../servers/servers.service';
import { ErrorHandler } from '../../../common/utils/error-handler.util';

/**
 * SSH连接服务
 * 负责管理SSH连接的创建、验证和关闭
 */
@Injectable()
export class SshConnectionService {
  private readonly logger = new Logger(SshConnectionService.name);
  private sshConnections: Map<number, NodeSSH> = new Map();

  constructor(private readonly serversService: ServersService) {}

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
        this.logger.warn(`SSH连接已断开，正在重新连接: ${error instanceof Error ? error.message : String(error)}`);
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
      const err = ErrorHandler.handleError(
        this.logger,
        error,
        `[getConnection] 连接服务器 ${serverId} 失败`,
      );
      await this.serversService.updateStatus(serverId, 'offline');
      throw new Error(
        `无法连接到服务器 ${server.host}:${server.port}: ${err.message}`,
      );
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
