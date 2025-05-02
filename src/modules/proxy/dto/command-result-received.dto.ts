import { ApiProperty } from '@nestjs/swagger';

/**
 * 命令结果接收确认DTO
 * 用于描述主服务器确认收到命令执行结果的响应
 */
export class CommandResultReceivedDto {
  @ApiProperty({
    description: '表示结果已成功接收',
    example: true,
    required: true,
  })
  success: boolean;
}
