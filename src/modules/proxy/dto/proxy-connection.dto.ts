import { ApiProperty } from '@nestjs/swagger';

/**
 * WebSocket连接参数DTO
 * 用于描述连接到代理WebSocket服务时需要提供的参数
 */
export class ProxyConnectionDto {
  @ApiProperty({
    description: '中介服务的唯一标识符',
    example: 'proxy-1',
    required: true,
  })
  proxyId: string;

  @ApiProperty({
    description: '用于验证中介服务身份的密钥',
    example: 'your-api-key',
    required: true,
  })
  apiKey: string;
}
