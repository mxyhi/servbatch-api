import { ApiProperty } from '@nestjs/swagger';
import { QueueStats } from '../../queue/types/queue.types';
import { SystemSummary, SystemSummaryWithProxies } from '../interfaces/system-summary.interface';

/**
 * 系统摘要DTO
 * 用于API文档和响应序列化
 */
export class SystemSummaryDto implements SystemSummary {
  @ApiProperty({ description: '服务器总数' })
  totalServers: number;
  
  @ApiProperty({ description: '在线服务器数量' })
  onlineServers: number;
  
  @ApiProperty({ description: '离线服务器数量' })
  offlineServers: number;
  
  @ApiProperty({ description: '未知状态服务器数量' })
  unknownServers: number;
  
  @ApiProperty({ description: '任务总数' })
  totalTasks: number;
  
  @ApiProperty({ description: '执行记录总数' })
  totalExecutions: number;
  
  @ApiProperty({ description: '正在运行的执行数量' })
  runningExecutions: number;
  
  @ApiProperty({ description: '排队中的执行数量' })
  queuedExecutions: number;
  
  @ApiProperty({ description: '队列状态信息' })
  queueStatus: QueueStats;
}

/**
 * 带代理信息的系统摘要DTO
 * 用于API文档和响应序列化
 */
export class SystemSummaryWithProxiesDto extends SystemSummaryDto implements SystemSummaryWithProxies {
  @ApiProperty({ description: '代理总数' })
  totalProxies: number;
  
  @ApiProperty({ description: '在线代理数量' })
  onlineProxies: number;
  
  @ApiProperty({ description: '离线代理数量' })
  offlineProxies: number;
  
  @ApiProperty({ description: '今日执行数量' })
  executionsToday: number;
  
  @ApiProperty({ description: '执行成功率（百分比）' })
  successRate: number;
}
