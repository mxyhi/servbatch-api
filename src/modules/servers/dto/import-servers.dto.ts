import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateServerDto } from './create-server.dto';
import { ServerEntity } from '../entities/server.entity';

/**
 * 服务器批量导入DTO
 * 用于批量导入服务器
 */
export class ImportServersDto {
  @ApiProperty({
    description: '服务器列表',
    type: [CreateServerDto],
    example: [
      {
        name: '测试服务器1',
        host: '192.168.1.1',
        port: 22,
        username: 'root',
        password: 'password123',
      },
      {
        name: '测试服务器2',
        host: '192.168.1.2',
        port: 22,
        username: 'admin',
        privateKey:
          '-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----',
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个服务器' })
  @ValidateNested({ each: true })
  @Type(() => CreateServerDto)
  servers: CreateServerDto[];
}

/**
 * 导入失败的服务器信息
 */
export class ImportFailureServerDto {
  @ApiProperty({ description: '服务器信息', type: CreateServerDto })
  server: CreateServerDto;

  @ApiProperty({ description: '失败原因' })
  reason: string;
}

/**
 * 服务器批量导入结果DTO
 */
export class ImportServersResultDto {
  @ApiProperty({ description: '成功导入的服务器数量' })
  successCount: number;

  @ApiProperty({ description: '导入失败的服务器数量' })
  failureCount: number;

  @ApiProperty({
    description: '成功导入的服务器列表',
    type: [ServerEntity],
    example: [
      {
        id: 1,
        name: '测试服务器1',
        host: '192.168.1.1',
        port: 22,
        username: 'root',
        password: 'password123',
        privateKey: null,
        status: 'unknown',
        lastChecked: null,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ],
  })
  successServers: ServerEntity[];

  @ApiProperty({
    description: '导入失败的服务器列表及原因',
    type: [ImportFailureServerDto],
    example: [
      {
        server: {
          name: '测试服务器2',
          host: '192.168.1.1',
          port: 22,
          username: 'admin',
          password: 'password123',
        },
        reason: '服务器 192.168.1.1:22 已存在',
      },
    ],
  })
  failureServers: ImportFailureServerDto[];
}
