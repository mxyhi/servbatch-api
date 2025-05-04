import { ApiProperty } from '@nestjs/swagger';
import { Server } from '@prisma/client';
import { ServerEntity } from '../entities/server.entity';

export class GetServerDetailsDto extends ServerEntity {
  @ApiProperty({
    description: '服务器启动时间',
    example: '2025-05-04T10:30:00Z',
  })
  bootTime: string | null; // 使用 ISO 8601 格式字符串

  @ApiProperty({
    description: '服务器已运行时间',
    example: 'up 2 days, 3 hours, 15 minutes',
  })
  uptime: string | null;

  // 继承 ServerEntity 中的 id, name, host, port, username, status, lastChecked, connectionType, proxyId, createdAt, updatedAt
  constructor(partial: Partial<GetServerDetailsDto & Server>) {
    super(); // 调用父类默认构造函数
    Object.assign(this, partial); // 将 partial 的属性复制到当前实例
    // 确保即使 partial 中没有这些属性，它们也被初始化为 null
    this.bootTime = partial.bootTime ?? null;
    this.uptime = partial.uptime ?? null;
  }
}
