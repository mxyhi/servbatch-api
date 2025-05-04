import { QueueStats } from '../../queue/types/queue.types';

/**
 * 系统摘要接口
 * 提供系统整体状态的摘要信息
 */
export interface SystemSummary {
  /**
   * 服务器总数
   */
  totalServers: number;
  
  /**
   * 在线服务器数量
   */
  onlineServers: number;
  
  /**
   * 离线服务器数量
   */
  offlineServers: number;
  
  /**
   * 未知状态服务器数量
   */
  unknownServers: number;
  
  /**
   * 任务总数
   */
  totalTasks: number;
  
  /**
   * 执行记录总数
   */
  totalExecutions: number;
  
  /**
   * 正在运行的执行数量
   */
  runningExecutions: number;
  
  /**
   * 排队中的执行数量
   */
  queuedExecutions: number;
  
  /**
   * 队列状态信息
   */
  queueStatus: QueueStats;
}

/**
 * 带代理信息的系统摘要接口
 * 扩展系统摘要，增加代理相关信息
 */
export interface SystemSummaryWithProxies extends SystemSummary {
  /**
   * 代理总数
   */
  totalProxies: number;
  
  /**
   * 在线代理数量
   */
  onlineProxies: number;
  
  /**
   * 离线代理数量
   */
  offlineProxies: number;
  
  /**
   * 今日执行数量
   */
  executionsToday: number;
  
  /**
   * 执行成功率
   */
  successRate: number;
}
