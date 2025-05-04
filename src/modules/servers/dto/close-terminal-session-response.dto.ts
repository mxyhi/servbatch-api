import { ApiProperty } from '@nestjs/swagger';

export class CloseTerminalSessionResponseDto {
  @ApiProperty({
    description: 'Indicates whether the session was closed successfully.',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'A message indicating the result of the close operation.',
    example: 'Terminal session closed successfully.',
    required: false,
  })
  message?: string;
}
