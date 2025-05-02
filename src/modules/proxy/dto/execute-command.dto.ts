import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 执行命令DTO
 * 用于描述主服务器发送给中介服务的命令执行请求
 */
export class ExecuteCommandDto {
  @ApiProperty({
    description: '命令的唯一ID',
    example: 'cmd_1620000000000_abc123',
    required: true,
  })
  commandId: string;

  @ApiProperty({
    description: '服务器ID',
    example: 123,
    required: true,
  })
  serverId: number;

  @ApiProperty({
    description: '服务器主机地址',
    example: '192.168.1.100',
    required: true,
  })
  host: string;

  @ApiProperty({
    description: 'SSH端口',
    example: 22,
    required: true,
  })
  port: number;

  @ApiProperty({
    description: '用户名',
    example: 'root',
    required: true,
  })
  username: string;

  @ApiPropertyOptional({
    description: '密码（如果使用密码认证）',
    example: 'password123',
  })
  password?: string;

  @ApiPropertyOptional({
    description: '私钥（如果使用密钥认证）',
    example: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...',
  })
  privateKey?: string;

  @ApiProperty({
    description: '要执行的命令',
    example: 'ls -la',
    required: true,
  })
  command: string;

  @ApiPropertyOptional({
    description: '超时时间（毫秒）',
    example: 30000,
  })
  timeout?: number;
}
