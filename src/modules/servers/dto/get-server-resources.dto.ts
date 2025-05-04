import { ApiProperty } from '@nestjs/swagger';

// Export the inner classes
// CPU使用情况 DTO
export class CpuUsageDto {
  @ApiProperty({ description: 'CPU 使用率 (%)', example: 15.5 })
  usage: number;

  @ApiProperty({ description: 'CPU 核心数', example: 8 })
  cores: number;

  @ApiProperty({
    description: '系统负载 (1分钟, 5分钟, 15分钟)',
    example: [0.5, 0.4, 0.35],
    type: [Number],
  })
  loadAverage: number[];
}

// 内存使用情况 DTO
export class MemoryUsageDto {
  @ApiProperty({ description: '总内存 (MB)', example: 8192 })
  total: number;

  @ApiProperty({ description: '已用内存 (MB)', example: 4096 })
  used: number;

  @ApiProperty({ description: '空闲内存 (MB)', example: 4096 })
  free: number;

  @ApiProperty({ description: '内存使用率 (%)', example: 50.0 })
  usage: number;
}

// GPU 显存使用情况 DTO
export class GpuMemoryUsageDto {
  @ApiProperty({ description: '总显存 (MB)', example: 10240 })
  total: number;

  @ApiProperty({ description: '已用显存 (MB)', example: 6144 })
  used: number;

  @ApiProperty({ description: '空闲显存 (MB)', example: 4096 })
  free: number;

  @ApiProperty({ description: '显存使用率 (%)', example: 60.0 })
  usage: number;
}

// GPU 使用情况 DTO
export class GpuUsageDto {
  @ApiProperty({ description: 'GPU 索引', example: 0 })
  index: number;

  @ApiProperty({ description: 'GPU 型号', example: 'NVIDIA GeForce RTX 3080' })
  name: string;

  @ApiProperty({ description: 'GPU 使用率 (%)', example: 75.2 })
  usage: number;

  @ApiProperty({ type: GpuMemoryUsageDto, description: '显存使用情况' })
  memory: GpuMemoryUsageDto;

  @ApiProperty({ description: 'GPU 温度 (°C)', example: 65 })
  temperature: number;
}

// 服务器资源 DTO
export class GetServerResourcesDto {
  @ApiProperty({ type: CpuUsageDto, description: 'CPU 使用情况' })
  cpu: CpuUsageDto;

  @ApiProperty({ type: MemoryUsageDto, description: '内存使用情况' })
  memory: MemoryUsageDto;

  @ApiProperty({
    type: [GpuUsageDto],
    description: 'GPU 使用情况列表', // 移除 "(可能为空)" 因为现在是必须的
  })
  gpu: GpuUsageDto[]; // 移除 '?' 使其成为必需字段

  @ApiProperty({
    description: '数据获取时间戳 (ISO 8601)',
    example: '2025-05-04T12:00:00Z',
  })
  timestamp: string;
}
