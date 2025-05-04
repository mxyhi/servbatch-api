import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  OnModuleDestroy,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { Client, ClientChannel, ConnectConfig } from 'ssh2'; // Import from ssh2
import { Server } from '@prisma/client';
import { ServersService } from './servers.service';
import { TerminalMessageType } from './dto/terminal-message.dto';

interface ActiveTerminalSession {
  id: string;
  serverId: number;
  sshClient: Client; // Store the ssh2 client instance
  sshStream: ClientChannel; // The SSH stream (PTY)
  webSocket: WebSocket; // The connected WebSocket client
}

@Injectable()
export class TerminalService implements OnModuleDestroy {
  private readonly logger = new Logger(TerminalService.name);
  private activeSessions: Map<string, ActiveTerminalSession> = new Map();
  private pendingSessions: Map<string, { serverId: number; expires: number }> =
    new Map();
  private readonly webSocketBaseUrl: string;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly PENDING_SESSION_TTL_MS = 60 * 1000; // 60 seconds TTL

  constructor(
    // SshConnectionService is no longer needed here for shell creation
    private readonly serversService: ServersService,
    private readonly configService: ConfigService,
  ) {
    const appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );
    const wsProtocol = appUrl.startsWith('https://') ? 'wss://' : 'ws://';
    const domain = appUrl.replace(/^https?:\/\//, '');
    this.webSocketBaseUrl = `${wsProtocol}${domain}/api/terminal`;
    this.logger.log(
      `WebSocket Base URL for Terminal: ${this.webSocketBaseUrl}`,
    );
    this.schedulePendingSessionCleanup();
  }

  async createSession(
    serverId: number,
  ): Promise<{ sessionId: string; webSocketUrl: string }> {
    const server = await this.serversService.findOne(serverId);
    if (!server) {
      this.logger.error(
        `Server with ID ${serverId} not found during session creation.`,
      );
      throw new NotFoundException(`Server with ID ${serverId} not found.`);
    }

    const sessionId = uuidv4();
    const webSocketUrl = this.webSocketBaseUrl;
    const expiryTime = Date.now() + this.PENDING_SESSION_TTL_MS;
    this.pendingSessions.set(sessionId, { serverId, expires: expiryTime });
    this.logger.log(
      `Pending session created for server ${serverId} (Session ID: ${sessionId}), expires at ${new Date(expiryTime).toISOString()}`,
    );
    this.schedulePendingSessionCleanup();
    return { sessionId, webSocketUrl };
  }

  async handleConnection(sessionId: string, ws: WebSocket): Promise<void> {
    this.logger.log(
      `WebSocket attempting connection for session: ${sessionId}`,
    );

    const serverId = await this.getServerIdForPendingSession(sessionId);
    if (!serverId) {
      this.logger.error(
        `No valid pending session found for ID: ${sessionId}. Closing WebSocket.`,
      );
      this.sendWsMessage(
        ws,
        TerminalMessageType.ERROR,
        'Invalid or expired session ID.',
      );
      ws.close();
      return;
    }

    const server = await this.serversService.findOne(serverId);
    if (!server) {
      this.logger.error(
        `Server with ID ${serverId} not found for session ${sessionId}. Closing WebSocket.`,
      );
      this.sendWsMessage(
        ws,
        TerminalMessageType.ERROR,
        `Server ${serverId} not found.`,
      );
      ws.close();
      this.pendingSessions.delete(sessionId);
      return;
    }

    this.pendingSessions.delete(sessionId); // Consume pending session
    this.logger.log(`Consumed pending session for ID: ${sessionId}`);

    const sshClient = new Client();
    const connectConfig: ConnectConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      ...(server.password && { password: server.password }),
      // ...(server.privateKey && { privateKey: Buffer.from(server.privateKey) }), // Handle private key if needed
      readyTimeout: 20000,
      keepaliveInterval: 10000,
    };

    sshClient.on('ready', () => {
      this.logger.log(
        `[${sessionId}] SSH Client Ready. Requesting PTY shell...`,
      );
      sshClient.shell({ term: 'xterm-color' }, (err, stream) => {
        // Request a PTY shell
        if (err) {
          this.logger.error(
            `[${sessionId}] SSH Shell/PTY Error: ${err.message}`,
            err.stack,
          );
          this.sendWsMessage(
            ws,
            TerminalMessageType.ERROR,
            `SSH Shell Error: ${err.message}`,
          );
          ws.close();
          sshClient.end();
          return;
        }

        this.logger.log(`[${sessionId}] SSH PTY stream established.`);
        const session: ActiveTerminalSession = {
          id: sessionId,
          serverId: server.id,
          sshClient, // Store the client
          sshStream: stream, // Store the stream
          webSocket: ws,
        };
        this.activeSessions.set(sessionId, session);
        this.logger.log(
          `Session ${sessionId} activated. Active session count: ${this.activeSessions.size}`,
        );

        // --- WebSocket Event Handlers ---
        ws.on('message', (message) =>
          this.handleWebSocketMessage(sessionId, message, stream, ws),
        );
        ws.on('close', () => this.handleWebSocketClose(sessionId));
        ws.on('error', (error) => this.handleWebSocketError(sessionId, error));

        // --- SSH Stream Event Handlers ---
        stream.on('data', (data: Buffer) =>
          this.handleSshData(sessionId, data, ws),
        );
        stream.on('close', () => this.handleSshClose(sessionId, ws)); // Stream close
        stream.stderr.on('data', (data: Buffer) =>
          this.handleSshError(sessionId, data, ws),
        );

        this.sendWsMessage(
          ws,
          TerminalMessageType.OUTPUT,
          'Terminal session established.\r\n',
        );
      });
    });

    sshClient.on('error', (err) => {
      this.logger.error(
        `[${sessionId}] SSH Client Connection Error: ${err.message}`,
        err.stack,
      );
      this.sendWsMessage(
        ws,
        TerminalMessageType.ERROR,
        `SSH Connection Error: ${err.message}`,
      );
      ws.close();
      // Ensure cleanup if session was partially added
      this.removeActiveSession(sessionId);
    });

    sshClient.on('close', () => {
      this.logger.log(`[${sessionId}] SSH Client Connection Closed.`);
      // This might be redundant if stream close handles it, but good for safety
      this.closeSessionInternally(sessionId, 'SSH client connection closed');
    });

    try {
      this.logger.log(
        `[${sessionId}] Attempting SSH connection to ${server.host}:${server.port}`,
      );
      sshClient.connect(connectConfig);
    } catch (error) {
      // Catch synchronous errors during connect setup if any
      this.logger.error(
        `[${sessionId}] Synchronous SSH connection setup error: ${error.message}`,
        error.stack,
      );
      this.sendWsMessage(
        ws,
        TerminalMessageType.ERROR,
        `SSH Setup Error: ${error.message}`,
      );
      ws.close();
    }
  }

  private handleWebSocketMessage(
    sessionId: string,
    message: import('ws').RawData, // Correct type from ws
    sshStream: ClientChannel,
    ws: WebSocket,
  ): void {
    try {
      // Ensure message is converted to a string correctly before parsing
      let messageString: string;
      if (Buffer.isBuffer(message)) {
        messageString = message.toString('utf-8');
      } else if (message instanceof ArrayBuffer) {
        // ws might provide ArrayBuffer, convert it
        messageString = Buffer.from(message).toString('utf-8');
      } else if (Array.isArray(message)) {
        // Handle Buffer[] case
        messageString = Buffer.concat(message).toString('utf-8');
      } else {
        // Should not happen with standard ws config, but handle defensively
        this.logger.error(
          `[${sessionId}] Received unexpected message type: ${typeof message}`,
        );
        this.sendWsMessage(
          ws,
          TerminalMessageType.ERROR,
          'Received unexpected message type.',
        );
        return;
      }

      const parsedMessage = JSON.parse(messageString);
      if (
        !parsedMessage ||
        typeof parsedMessage !== 'object' ||
        !parsedMessage.type
      ) {
        this.logger.warn(`[${sessionId}] Received invalid message format`);
        this.sendWsMessage(
          ws,
          TerminalMessageType.ERROR,
          'Invalid message format.',
        );
        return;
      }

      const session = this.activeSessions.get(sessionId);
      if (!session || !session.sshStream || session.sshStream.destroyed) {
        this.logger.warn(
          `[${sessionId}] Received message for closed or non-existent session.`,
        );
        if (ws.readyState === WebSocket.OPEN) {
          this.sendWsMessage(
            ws,
            TerminalMessageType.ERROR,
            'Session is closed.',
          );
        }
        return;
      }

      switch (parsedMessage.type) {
        case TerminalMessageType.INPUT:
          if (typeof parsedMessage.data === 'string') {
            session.sshStream.write(parsedMessage.data);
          } else {
            this.logger.warn(
              `[${sessionId}] Received input message with non-string data`,
            );
          }
          break;
        case TerminalMessageType.RESIZE:
          if (
            parsedMessage.data &&
            typeof parsedMessage.data.cols === 'number' &&
            typeof parsedMessage.data.rows === 'number'
          ) {
            // Use the stream's setWindow method for PTY resize
            session.sshStream.setWindow(
              parsedMessage.data.rows,
              parsedMessage.data.cols,
              0,
              0,
            );
            this.logger.log(
              `[${sessionId}] Resized terminal to ${parsedMessage.data.cols}x${parsedMessage.data.rows}`,
            );
          } else {
            this.logger.warn(
              `[${sessionId}] Received invalid resize message data`,
            );
          }
          break;
        case TerminalMessageType.CLOSE:
          this.logger.log(`[${sessionId}] Received close request from client`);
          this.closeSession(sessionId);
          break;
        default:
          this.logger.warn(
            `[${sessionId}] Received unknown message type: ${parsedMessage.type}`,
          );
          this.sendWsMessage(
            ws,
            TerminalMessageType.ERROR,
            `Unknown message type: ${parsedMessage.type}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `[${sessionId}] Error processing WebSocket message: ${error.message}`,
        error.stack,
      );
      if (ws.readyState === WebSocket.OPEN) {
        this.sendWsMessage(
          ws,
          TerminalMessageType.ERROR,
          'Error processing message.',
        );
      }
    }
  }

  private handleWebSocketClose(sessionId: string): void {
    this.logger.log(`WebSocket closed for session: ${sessionId}`);
    this.closeSessionInternally(sessionId, 'WebSocket closed');
  }

  private handleWebSocketError(sessionId: string, error: Error): void {
    this.logger.error(
      `WebSocket error for session ${sessionId}: ${error.message}`,
      error.stack,
    );
    this.closeSessionInternally(sessionId, 'WebSocket error');
  }

  private handleSshData(sessionId: string, data: Buffer, ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
      this.sendWsMessage(
        ws,
        TerminalMessageType.OUTPUT,
        data.toString('utf-8'),
      );
    } else {
      this.logger.warn(
        `[${sessionId}] SSH data received but WebSocket is not open. Discarding data.`,
      );
    }
  }

  private handleSshError(sessionId: string, data: Buffer, ws: WebSocket): void {
    this.logger.error(`[${sessionId}] SSH stderr: ${data.toString('utf-8')}`);
    if (ws.readyState === WebSocket.OPEN) {
      this.sendWsMessage(
        ws,
        TerminalMessageType.ERROR,
        `SSH Error: ${data.toString('utf-8')}`,
      );
    }
  }

  private handleSshClose(sessionId: string, ws: WebSocket): void {
    // This handles the stream closing, the client closing is handled separately
    this.logger.log(`SSH stream closed for session: ${sessionId}`);
    if (ws.readyState === WebSocket.OPEN) {
      this.sendWsMessage(ws, TerminalMessageType.CLOSE, 'SSH stream closed.');
      // Don't necessarily close the WebSocket here, let the client or WS close event handle it
      // ws.close();
    }
    // Important: Clean up the session resources when the stream closes
    this.closeSessionInternally(sessionId, 'SSH stream closed');
  }

  closeSession(sessionId: string): boolean {
    this.logger.log(
      `Attempting to close session via API/Client request: ${sessionId}`,
    );
    return this.closeSessionInternally(sessionId, 'Session closed by request');
  }

  private closeSessionInternally(sessionId: string, reason: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      // Already closed or never existed
      return false;
    }

    this.logger.log(`Closing session ${sessionId}. Reason: ${reason}`);

    // 1. End the SSH Client connection (this should also close the stream)
    if (session.sshClient && !session.sshClient['_closing']) {
      // Check internal flag if available or just call end()
      try {
        session.sshClient.end();
        this.logger.log(`[${sessionId}] SSH client connection ended.`);
      } catch (sshError) {
        this.logger.error(
          `[${sessionId}] Error ending SSH client connection: ${sshError.message}`,
        );
      }
    }

    // 2. Close WebSocket (if open)
    if (session.webSocket && session.webSocket.readyState === WebSocket.OPEN) {
      try {
        // Send close message only if initiated by server/API, not if WS itself closed
        if (reason !== 'WebSocket closed' && reason !== 'WebSocket error') {
          this.sendWsMessage(
            session.webSocket,
            TerminalMessageType.CLOSE,
            `Session closed: ${reason}`,
          );
        }
        session.webSocket.close();
        this.logger.log(`[${sessionId}] WebSocket closed.`);
      } catch (wsError) {
        this.logger.error(
          `[${sessionId}] Error closing WebSocket: ${wsError.message}`,
        );
      }
    }

    // 3. Remove session from active map - DO THIS LAST
    this.removeActiveSession(sessionId);
    return true;
  }

  private removeActiveSession(sessionId: string): void {
    if (this.activeSessions.delete(sessionId)) {
      this.logger.log(
        `Removed session ${sessionId} from active map. Remaining sessions: ${this.activeSessions.size}`,
      );
    }
  }

  private async getServerIdForPendingSession(
    sessionId: string,
  ): Promise<number | null> {
    const pending = this.pendingSessions.get(sessionId);
    if (!pending) {
      this.logger.warn(`Pending session ID ${sessionId} not found.`);
      return null;
    }
    if (Date.now() > pending.expires) {
      this.logger.warn(`Pending session ID ${sessionId} has expired.`);
      this.pendingSessions.delete(sessionId);
      return null;
    }
    return pending.serverId;
  }

  private schedulePendingSessionCleanup(): void {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      this.pendingSessions.forEach((session, id) => {
        if (now > session.expires) {
          this.pendingSessions.delete(id);
          cleanedCount++;
        }
      });
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} expired pending sessions.`);
      }
      if (this.pendingSessions.size === 0 && this.cleanupInterval) {
        this.logger.log('No pending sessions left, stopping cleanup interval.');
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
    }, this.PENDING_SESSION_TTL_MS);
    this.logger.log(
      `Scheduled pending session cleanup interval (${this.PENDING_SESSION_TTL_MS}ms).`,
    );
  }

  private sendWsMessage(
    ws: WebSocket,
    type: TerminalMessageType,
    data: any,
  ): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type, data }));
      } catch (error) {
        this.logger.error(`Failed to send WebSocket message: ${error.message}`);
      }
    }
  }

  onModuleDestroy() {
    this.logger.log(
      'TerminalService shutting down. Closing all active sessions...',
    );
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach((sessionId) => {
      this.closeSessionInternally(sessionId, 'Server shutting down');
    });
    this.activeSessions.clear();
    this.pendingSessions.clear();
    this.logger.log('All active terminal sessions closed.');
  }
}
