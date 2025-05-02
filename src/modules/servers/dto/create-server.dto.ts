import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsNotEmpty,
  IsIP,
  ValidateIf,
  IsEnum,
} from 'class-validator';

export class CreateServerDto {
  @ApiProperty({ description: '服务器名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '服务器主机地址' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiPropertyOptional({ description: '服务器SSH端口', default: 22 })
  @IsInt()
  @Min(1)
  @IsOptional()
  port?: number = 22;

  @ApiProperty({ description: '用户名' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ description: '密码（如果使用密码认证）' })
  @IsString()
  @ValidateIf((o) => !o.privateKey)
  @IsNotEmpty()
  password?: string;

  @ApiPropertyOptional({ description: '私钥（如果使用密钥认证）' })
  @IsString()
  @ValidateIf((o) => !o.password)
  @IsNotEmpty()
  privateKey?: string;

  @ApiPropertyOptional({
    description: '连接类型',
    enum: ['direct', 'proxy'],
    default: 'direct',
  })
  @IsEnum(['direct', 'proxy'])
  @IsOptional()
  connectionType?: string = 'direct';

  @ApiPropertyOptional({
    description: '代理ID（如果通过代理连接）',
  })
  @IsString()
  @IsOptional()
  @ValidateIf((o) => o.connectionType === 'proxy')
  proxyId?: string;
}
