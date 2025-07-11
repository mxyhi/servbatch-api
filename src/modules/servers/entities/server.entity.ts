import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Server } from '@prisma/client';
import { ServerStatus, ConnectionType } from '../../../common/constants';
import {
  ServerStatusType,
  ConnectionTypeType,
} from '../../../common/constants';

export class ServerEntity implements Server, Record<string, unknown> {
  // 添加索引签名以满足Record<string, unknown>约束
  [key: string]: unknown;
  @ApiProperty({ description: '服务器ID' })
  id: number;

  @ApiProperty({ description: '服务器名称' })
  name: string;

  @ApiProperty({ description: '服务器主机地址' })
  host: string;

  @ApiProperty({ description: '服务器SSH端口' })
  port: number;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiPropertyOptional({ description: '密码（如果使用密码认证）' })
  password: string | null;

  @ApiPropertyOptional({ description: '私钥（如果使用密钥认证）' })
  privateKey: string | null;

  @ApiProperty({
    description: '服务器状态',
    enum: Object.values(ServerStatus),
    enumName: 'ServerStatus',
  })
  status: ServerStatusType;

  @ApiPropertyOptional({ description: '最后检查时间' })
  lastChecked: Date | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({
    description: '连接类型',
    enum: Object.values(ConnectionType),
    enumName: 'ConnectionType',
    default: ConnectionType.DIRECT,
  })
  connectionType: ConnectionTypeType;

  @ApiPropertyOptional({ description: '代理ID（如果通过代理连接）' })
  proxyId: string | null;
}
