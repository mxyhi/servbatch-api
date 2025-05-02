import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Proxy as PrismaProxy } from '@prisma/client';

export class ProxyEntity implements PrismaProxy {
  @ApiProperty({ description: '代理ID' })
  id: string;

  @ApiProperty({ description: '代理名称' })
  name: string;

  @ApiPropertyOptional({ description: '代理描述' })
  description: string | null;

  @ApiPropertyOptional({ description: 'API密钥' })
  apiKey: string | null;

  @ApiPropertyOptional({ description: '最后一次连接时间' })
  lastSeen: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  // 非数据库字段，用于表示代理的在线状态
  @ApiProperty({
    description: '代理状态',
    enum: ['online', 'offline'],
    default: 'offline',
  })
  status?: string;
}
