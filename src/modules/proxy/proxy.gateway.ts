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
    this.logger.debug(`收到命令执行结果: ${JSON.stringify(payload)}`);

    // 通过事件发射器通知等待结果的服务
    this.eventEmitter.emit('command_result', payload);

    return { event: 'command_result_received', data: { success: true } };
  }

  // 发送命令到特定的代理
  async sendCommand(proxyId: string, command: any): Promise<boolean> {
    const client = this.proxyClients.get(proxyId);
    if (!client) {
      this.logger.error(`代理 ${proxyId} 未连接`);
      return false;
    }

    this.logger.debug(`向代理 ${proxyId} 发送命令: ${JSON.stringify(command)}`);
    client.emit('execute_command', command);
    return true;
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
