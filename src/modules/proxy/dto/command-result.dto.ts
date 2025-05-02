import { ApiProperty } from '@nestjs/swagger';

/**
 * 命令执行结果的内部结构
 */
class CommandResultDetail {
  @ApiProperty({
    description: '命令的标准输出',
    example: 'total 20\ndrwxr-xr-x 4 root root 4096 May 10 12:34 .',
  })
  stdout: string;

  @ApiProperty({
    description: '命令的错误输出',
    example: '',
  })
  stderr: string;

  @ApiProperty({
    description: '命令的退出码，0表示成功',
    example: 0,
  })
  exitCode: number;
}

/**
 * 命令执行结果DTO
 * 用于描述中介服务发送给主服务器的命令执行结果
 */
export class CommandResultDto {
  @ApiProperty({
    description: '命令的唯一ID（与请求中的commandId相同）',
    example: 'cmd_1620000000000_abc123',
    required: true,
  })
  commandId: string;

  @ApiProperty({
    description: '命令执行结果',
    type: CommandResultDetail,
  })
  result: CommandResultDetail;
}
