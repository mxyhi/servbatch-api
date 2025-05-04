import { ApiProperty } from '@nestjs/swagger';

export class CreateTerminalSessionResponseDto {
  @ApiProperty({
    description: 'The unique identifier for the terminal session.',
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
  })
  sessionId: string;

  @ApiProperty({
    description: 'The WebSocket URL for connecting to the terminal session.',
    example: 'ws://localhost:3000/api/terminal', // Base URL, sessionId will be passed in query or handshake
  })
  webSocketUrl: string;
}
