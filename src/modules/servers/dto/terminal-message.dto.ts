import { ApiProperty } from '@nestjs/swagger';

export enum TerminalMessageType {
  INPUT = 'input',
  OUTPUT = 'output',
  CLOSE = 'close',
  ERROR = 'error', // Added for error reporting
  RESIZE = 'resize', // Added for terminal resize events
}

export class TerminalMessageDto {
  @ApiProperty({
    description: 'The type of the terminal message.',
    enum: TerminalMessageType,
    example: TerminalMessageType.INPUT,
  })
  type: TerminalMessageType;

  @ApiProperty({
    description:
      'The data payload for the message (e.g., input string, output buffer, error message, resize dimensions).',
    required: false,
    example: 'ls -la', // Example for input/output
    // Example for resize: { cols: 80, rows: 24 }
  })
  data?: any; // Can be string for input/output, or object for resize { cols, rows }
}
