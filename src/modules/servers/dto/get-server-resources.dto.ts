import { ApiProperty } from '@nestjs/swagger';

// Export the inner classes
export class CpuUsageDto {
  @ApiProperty({ description: 'CPU 使用率 (%)', example: 15.5 })
  usagePercent: number | null;
}

export class MemoryUsageDto {
  @ApiProperty({ description: '已用内存 (MB)', example: 4096 })
  usedMb: number | null;

  @ApiProperty({ description: '总内存 (MB)', example: 8192 })
  totalMb: number | null;

  @ApiProperty({ description: '内存使用率 (%)', example: 50.0 })
  usagePercent: number | null;
}

export class GpuUsageDto {
  @ApiProperty({ description: 'GPU 型号', example: 'NVIDIA GeForce RTX 3080' })
  name: string | null;

  @ApiProperty({ description: 'GPU 使用率 (%)', example: 75.2 })
  utilizationPercent: number | null;

  @ApiProperty({ description: '已用显存 (MB)', example: 6144 })
  memoryUsedMb: number | null;

  @ApiProperty({ description: '总显存 (MB)', example: 10240 })
  memoryTotalMb: number | null;

  @ApiProperty({ description: '显存使用率 (%)', example: 60.0 })
  memoryUsagePercent: number | null;

  @ApiProperty({ description: 'GPU 温度 (°C)', example: 65 })
  temperatureCelsius: number | null;
}

export class GetServerResourcesDto {
  @ApiProperty({ type: CpuUsageDto, description: 'CPU 使用情况' })
  cpu: CpuUsageDto;

  @ApiProperty({ type: MemoryUsageDto, description: '内存使用情况' })
  memory: MemoryUsageDto;

  @ApiProperty({
    type: [GpuUsageDto],
    description: 'GPU 使用情况列表 (可能为空)',
    required: false,
  })
  gpu?: GpuUsageDto[]; // 可能有多张 GPU 或没有 GPU

  @ApiProperty({
    description: '数据获取时间戳',
    example: '2025-05-04T12:00:00Z',
  })
  timestamp: string; // 使用 ISO 8601 格式字符串

  constructor(partial: Partial<GetServerResourcesDto>) {
    this.cpu = partial.cpu ?? { usagePercent: null };
    this.memory = partial.memory ?? {
      usedMb: null,
      totalMb: null,
      usagePercent: null,
    };
    this.gpu = partial.gpu;
    this.timestamp = partial.timestamp ?? new Date().toISOString();
  }
}
