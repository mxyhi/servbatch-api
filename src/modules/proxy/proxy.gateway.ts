import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProxyService } from './proxy.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // 在生产环境中应该限制为特定域名
  },
  namespace: 'proxy',
})
export class ProxyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ProxyGateway.name);
  private proxyClients: Map<string, Socket> = new Map();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly proxyService: ProxyService,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const proxyId = client.handshake.query.proxyId as string;
    if (!proxyId) {
      this.logger.error('代理ID未提供，断开连接');
      client.disconnect();
      return;
    }

    // 简单的API密钥验证
    const apiKey = client.handshake.query.apiKey as string;
    if (!apiKey || apiKey !== process.env.PROXY_API_KEY) {
      this.logger.error('API密钥无效，断开连接');
      client.disconnect();
      return;
    }

    this.logger.log(`代理 ${proxyId} 已连接`);
    this.proxyClients.set(proxyId, client);

    // 更新代理的最后连接时间
    await this.proxyService.updateLastSeen(proxyId);

    // 广播代理状态更新
    this.server.emit('proxy_status_update', {
      id: proxyId,
      status: 'online',
    });
  }

  handleDisconnect(client: Socket) {
    const proxyId = client.handshake.query.proxyId as string;
    if (proxyId) {
      this.logger.log(`代理 ${proxyId} 已断开连接`);
      this.proxyClients.delete(proxyId);

      // 广播代理状态更新
      this.server.emit('proxy_status_update', {
        id: proxyId,
        status: 'offline',
      });
    }
  }

  @SubscribeMessage('command_result')
  handleCommandResult(_client: Socket, payload: any): WsResponse<any> {
    if (!payload || !payload.commandId) {
      this.logger.error('收到的命令执行结果缺少commandId');
      return {
        event: 'command_result_received',
        data: { success: false, error: '缺少commandId' },
      };
    }

    // 只发送到特定的命令结果事件，供 sendCommand 中的 Promise 监听
    const specificEvent = `command_result_${payload.commandId}`;
    // 发送包含 stdout, stderr, exitCode 的完整 result 对象
    this.eventEmitter.emit(specificEvent, payload.result);

    return { event: 'command_result_received', data: { success: true } };
  }

  // 发送命令到特定的代理，并返回一个包含结果的 Promise
  async sendCommand(
    proxyId: string,
    command: {
      commandId: string;
      timeout?: number;
      [key: string]: any; // 其他命令参数
    },
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const client = this.proxyClients.get(proxyId);
    if (!client) {
      this.logger.error(`[sendCommand] 代理 ${proxyId} 未连接`);
      throw new Error(`代理 ${proxyId} 未连接`);
    }

    const commandId = command.commandId;
    const maxWaitTime = command.timeout || 30000; // 默认30秒超时
    const eventName = `command_result_${commandId}`;

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let listener: ((result: any) => void) | null = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (listener) {
          this.eventEmitter.off(eventName, listener);
          listener = null;
        }
      };

      timeoutId = setTimeout(() => {
        this.logger.warn(
          `[sendCommand] 命令 ${commandId} 在网关等待结果超时 (${maxWaitTime}ms)`,
        );
        cleanup();
        reject(new Error(`命令执行超时 (${maxWaitTime}ms)`));
      }, maxWaitTime);

      listener = (result) => {
        this.logger.log(
          `[sendCommand] 监听到命令 ${commandId} 的结果: ${JSON.stringify(result)}`,
        );
        cleanup();
        // 确保返回的对象结构符合 Promise 类型定义
        if (
          typeof result === 'object' &&
          result !== null &&
          'stdout' in result &&
          'stderr' in result &&
          'exitCode' in result
        ) {
          resolve(result);
        } else {
          this.logger.error(
            `[sendCommand] 命令 ${commandId} 返回的结果格式不正确: ${JSON.stringify(result)}`,
          );
          reject(new Error('命令返回结果格式不正确'));
        }
      };

      this.eventEmitter.on(eventName, listener);

      // 发送命令到代理客户端
      client.emit('execute_command', command, (ack) => {
        // 可选：处理客户端的确认回执
        if (ack && ack.error) {
          this.logger.error(
            `[sendCommand] 代理 ${proxyId} 确认接收命令 ${commandId} 时出错: ${ack.error}`,
          );
          cleanup();
          reject(new Error(`代理端执行命令出错: ${ack.error}`));
        } else {
        }
      });
    });
  }

  // 检查代理是否在线
  isProxyOnline(proxyId: string): boolean {
    return this.proxyClients.has(proxyId);
  }

  // 获取所有在线代理
  getOnlineProxies(): string[] {
    return Array.from(this.proxyClients.keys());
  }
}
