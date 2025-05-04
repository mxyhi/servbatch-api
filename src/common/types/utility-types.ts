/**
 * TypeScript类型工具模块
 * 提供高级类型操作和类型体操
 */

// 从Prisma模型中提取实体类型
export type ExtractEntity<T> = Omit<T, 'password'>;

// 从Prisma模型中提取查询条件类型
export type WhereCondition<T> = {
  [K in keyof T]?: T[K] extends object
    ? WhereCondition<T[K]>
    : T[K] extends string
    ? { contains?: string; equals?: string; in?: string[] }
    : T[K] extends number
    ? { equals?: number; gt?: number; gte?: number; lt?: number; lte?: number; in?: number[] }
    : T[K] extends Date
    ? { equals?: Date; gt?: Date; gte?: Date; lt?: Date; lte?: Date }
    : T[K] extends boolean
    ? boolean
    : never;
};

// 从Prisma模型中提取排序条件类型
export type OrderByCondition<T> = {
  [K in keyof T]?: 'asc' | 'desc';
};

// 从Prisma模型中提取包含关系类型
export type IncludeRelation<T> = {
  [K in keyof T]?: boolean;
};

// 分页结果类型
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// 服务响应类型
export type ServiceResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

// 深度部分类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 非空类型
export type NonNullable<T> = T extends null | undefined ? never : T;

// 可选字段类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// 必填字段类型
export type Required<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: T[P];
};

// 排除字段类型
export type Except<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// 选择字段类型
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 记录类型
export type Record<K extends keyof any, T> = {
  [P in K]: T;
};

// 联合类型转交叉类型
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

// 提取Promise返回类型
export type PromiseType<T> = T extends Promise<infer U> ? U : T;
