/**
 * 常量管理模块
 * 集中管理项目中使用的常量，替代enum
 */

// 排序方向常量
export const SortOrder = {
  ASCEND: 'ascend',
  DESCEND: 'descend',
} as const;

export type SortOrderType = (typeof SortOrder)[keyof typeof SortOrder];

// 任务执行状态常量
export const TaskExecutionStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type TaskExecutionStatusType =
  (typeof TaskExecutionStatus)[keyof typeof TaskExecutionStatus];

// 服务器状态常量
export const ServerStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  UNKNOWN: 'unknown',
} as const;

export type ServerStatusType = (typeof ServerStatus)[keyof typeof ServerStatus];

// 服务器连接类型常量
export const ConnectionType = {
  DIRECT: 'direct',
  PROXY: 'proxy',
} as const;

export type ConnectionTypeType =
  (typeof ConnectionType)[keyof typeof ConnectionType];

// 用户角色常量
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// 代理状态常量
export const ProxyStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline',
} as const;

export type ProxyStatusType = (typeof ProxyStatus)[keyof typeof ProxyStatus];

// 分页默认值常量
export const PaginationDefaults = {
  PAGE: 1,
  PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
} as const;

// 日期字段常量
export const DateField = {
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
  EXECUTED_AT: 'executedAt',
  STARTED_AT: 'startedAt',
  COMPLETED_AT: 'completedAt',
  LAST_SEEN: 'lastSeen',
} as const;

export type DateFieldType = (typeof DateField)[keyof typeof DateField];
