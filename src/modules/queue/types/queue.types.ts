/**
 * 队列模块类型定义
 */

/**
 * 队列状态统计接口
 * 提供队列各状态任务数量的统计信息
 */
export interface QueueStats {
  waiting: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}
