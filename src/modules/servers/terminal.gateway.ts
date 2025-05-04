import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws'; // Use 'ws' types
import { Logger, Injectable, UsePipes, ValidationPipe } from '@nestjs/common';
import { TerminalService } from './terminal.service';
import {
  TerminalMessageDto,
  TerminalMessageType,
} from './dto/terminal-message.dto';

@Injectable() // Make sure Gateway is injectable if needed elsewhere, though usually not
@WebSocketGateway({
  path: '/api/terminal', // Base path, sessionId will be handled manually
  // Consider adding options like cors if needed:
  // cors: {
  //   origin: '*', // Adjust for production
  // },
})
export class TerminalGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server; // ws Server instance

  private readonly logger = new Logger(TerminalGateway.name);

  constructor(private readonly terminalService: TerminalService) {}

  /**
   * Handles incoming WebSocket connections.
   * Extracts sessionId from the handshake URL (e.g., ws://.../api/terminal?sessionId=xxx).
   * Delegates the connection handling to TerminalService.
   * @param client The connecting WebSocket client.
   * @param args Additional arguments (like the request object).
   */
  async handleConnection(client: WebSocket, ...args: any[]): Promise<void> {
    const request = args[0]; // The incoming HTTP request during handshake
    let sessionId: string | null = null;

    // Extract sessionId from query parameters (common approach)
    // Example URL: ws://localhost:3000/api/terminal?sessionId=a1b2c3d4...
    if (request?.url) {
      try {
        const url = new URL(request.url, `ws://${request.headers.host}`); // Provide a base URL
        sessionId = url.searchParams.get('sessionId');
      } catch (e) {
        this.logger.error(
          `Failed to parse URL for sessionId: ${request.url}`,
          e,
        );
      }
    }

    if (!sessionId) {
      this.logger.error(
        'Connection attempt without sessionId in query parameter. Closing connection.',
      );
      client.send(
        JSON.stringify({
          type: TerminalMessageType.ERROR,
          data: 'Session ID is required.',
        }),
      );
      client.close();
      return;
    }

    this.logger.log(`Client connecting with Session ID: ${sessionId}`);

    try {
      // Pass the validated client and sessionId to the service
      await this.terminalService.handleConnection(sessionId, client);
      // Service now handles all further communication and errors for this client
    } catch (error) {
      // Catch errors during the *initial* handleConnection phase in the service
      this.logger.error(
        `Error during initial connection handling for session ${sessionId}: ${error.message}`,
        error.stack,
      );
      // Ensure client is closed if service failed before taking ownership
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: TerminalMessageType.ERROR,
            data: `Failed to establish terminal session: ${error.message}`,
          }),
        );
        client.close();
      }
    }
  }

  /**
   * Handles WebSocket disconnections.
   * The TerminalService's internal handlers ('close', 'error' on ws) should manage
   * the cleanup, but logging here is useful.
   * @param client The disconnecting WebSocket client.
   */
  handleDisconnect(client: WebSocket): void {
    // Find the session associated with this client if needed for logging,
    // but the TerminalService should already be handling the cleanup via its 'close' event handler.
    this.logger.log(`Client disconnected.`);
    // Optional: You could try to find the sessionId associated with 'client'
    // from terminalService.activeSessions if you need to log which session disconnected here.
  }

  // Note: We don't need @SubscribeMessage handlers here for 'input', 'resize', 'close'
  // because the TerminalService attaches direct listeners ('message', 'close')
  // to the WebSocket instance in `handleConnection`. This is more efficient.
  // If we used @SubscribeMessage, NestJS would parse every message, adding overhead.
}
