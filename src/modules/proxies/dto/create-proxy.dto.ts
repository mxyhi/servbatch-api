import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProxyDto {
  @ApiProperty({ description: '代理ID', example: 'proxy-1' })
  @IsNotEmpty()
  @IsString()
  id: string;

  @ApiProperty({ description: '代理名称', example: '测试代理' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '代理描述', example: '用于测试的代理' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'API密钥', example: 'your-api-key' })
  @IsOptional()
  @IsString()
  apiKey?: string;
}
