/**
 * TypeScript类型工具模块
 * 提供高级类型操作和类型体操
 *
 * 包含自定义类型工具和对TypeScript内置类型的增强
 */

/**
 * 从Prisma模型中提取实体类型，排除敏感字段
 * @example
 * type User = { id: number; name: string; password: string; }
 * type SafeUser = ExtractEntity<User>; // { id: number; name: string; }
 */
export type ExtractEntity<T> = Omit<T, 'password'>;

/**
 * 从Prisma模型中提取查询条件类型，用于构建过滤条件
 * @example
 * type User = { id: number; name: string; }
 * type UserWhere = WhereCondition<User>;
 * // { id?: { equals?: number; ... }; name?: { contains?: string; ... }; }
 */
export type WhereCondition<T> = {
  [K in keyof T]?: T[K] extends object
    ? WhereCondition<T[K]>
    : T[K] extends string
      ? { contains?: string; equals?: string; in?: string[] }
      : T[K] extends number
        ? {
            equals?: number;
            gt?: number;
            gte?: number;
            lt?: number;
            lte?: number;
            in?: number[];
          }
        : T[K] extends Date
          ? { equals?: Date; gt?: Date; gte?: Date; lt?: Date; lte?: Date }
          : T[K] extends boolean
            ? boolean
            : never;
};

/**
 * 从Prisma模型中提取排序条件类型
 * @example
 * type User = { id: number; name: string; }
 * type UserOrderBy = OrderByCondition<User>; // { id?: 'asc' | 'desc'; name?: 'asc' | 'desc'; }
 */
export type OrderByCondition<T> = {
  [K in keyof T]?: 'asc' | 'desc';
};

/**
 * 从Prisma模型中提取包含关系类型
 * @example
 * type User = { id: number; posts: Post[]; }
 * type UserInclude = IncludeRelation<User>; // { posts?: boolean; }
 */
export type IncludeRelation<T> = {
  [K in keyof T]?: boolean;
};

/**
 * 分页结果类型
 * @example
 * type PaginatedUsers = PaginatedResult<User>;
 */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * 服务响应类型
 * @example
 * type UserResponse = ServiceResponse<User>;
 */
export type ServiceResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
};

/**
 * 深度部分类型 - 递归地使所有属性可选
 * @example
 * type User = { id: number; profile: { name: string; age: number; } }
 * type PartialUser = DeepPartial<User>;
 * // { id?: number; profile?: { name?: string; age?: number; } }
 */
export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
    }
  : T;

/**
 * 可选字段类型 - 使指定字段可选
 * 与TypeScript内置的Partial不同，只对特定字段起作用
 * @example
 * type User = { id: number; name: string; age: number; }
 * type UserWithOptionalAge = Optional<User, 'age'>; // { id: number; name: string; age?: number; }
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必填字段类型 - 使指定字段必填
 * @example
 * type User = { id?: number; name?: string; }
 * type UserWithRequiredId = RequiredField<User, 'id'>; // { id: number; name?: string; }
 */
export type RequiredField<T, K extends keyof T> = Omit<T, K> & {
  [P in K]-?: T[P];
};

/**
 * 排除字段类型 - 从类型中排除指定字段
 * @example
 * type User = { id: number; password: string; name: string; }
 * type PublicUser = Except<User, 'password'>; // { id: number; name: string; }
 */
export type Except<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * 联合类型转交叉类型
 * @example
 * type Union = { a: string } | { b: number };
 * type Intersection = UnionToIntersection<Union>; // { a: string } & { b: number }
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * 提取Promise返回类型
 * @example
 * type P = Promise<string>;
 * type Result = PromiseType<P>; // string
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : T;

/**
 * 从对象字面量类型中提取值类型的联合
 * @example
 * const Status = { ACTIVE: 'active', INACTIVE: 'inactive' } as const;
 * type StatusValue = ValueOf<typeof Status>; // 'active' | 'inactive'
 */
export type ValueOf<T> = T[keyof T];

/**
 * 从对象类型中创建字符串字面量联合类型
 * @example
 * type User = { id: number; name: string; age: number; }
 * type UserKeys = KeysToUnion<User>; // 'id' | 'name' | 'age'
 */
export type KeysToUnion<T> = keyof T;

/**
 * 获取函数返回类型
 * @example
 * function getUser() { return { id: 1, name: 'Test' }; }
 * type User = ReturnTypeOf<typeof getUser>; // { id: number; name: string; }
 */
export type ReturnTypeOf<T extends (...args: any[]) => any> = ReturnType<T>;

/**
 * 从元组类型中提取类型
 * @example
 * type Tuple = [string, number, boolean];
 * type T0 = TupleElement<Tuple, 0>; // string
 * type T1 = TupleElement<Tuple, 1>; // number
 */
export type TupleElement<
  T extends readonly any[],
  N extends number,
> = N extends keyof T ? T[N] : never;

/**
 * 只读类型 - 递归地使所有属性只读
 * @example
 * type User = { id: number; profile: { name: string; } }
 * type ReadonlyUser = DeepReadonly<User>;
 * // { readonly id: number; readonly profile: { readonly name: string; } }
 */
export type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;

/**
 * 提取非函数类型属性
 * @example
 * type API = { data: string; fetchData: () => void; }
 * type APIData = NonFunctionProperties<API>; // { data: string; }
 */
export type NonFunctionProperties<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends Function ? never : K;
  }[keyof T]
>;

/**
 * 提取函数类型属性
 * @example
 * type API = { data: string; fetchData: () => void; }
 * type APIMethods = FunctionProperties<API>; // { fetchData: () => void; }
 */
export type FunctionProperties<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends Function ? K : never;
  }[keyof T]
>;

/**
 * 字符串模板类型
 * @example
 * type RouteParams = StringTemplate<'/users/:id/posts/:postId'>;
 * // { id: string; postId: string; }
 */
export type StringTemplate<S extends string> =
  S extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & StringTemplate<Rest>
    : S extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {};

/**
 * Prisma模型类型
 * 表示Prisma ORM模型的通用接口
 * 用于替代代码中的any类型，提高类型安全性
 * @example
 * function getUsers(model: PrismaModel<User>) {
 *   return model.findMany();
 * }
 */
export interface PrismaModel<T> {
  findMany: (args?: any) => Promise<T[]>;
  findUnique: (args: { where: any }) => Promise<T | null>;
  findFirst: (args: { where: any }) => Promise<T | null>;
  create: (args: { data: any }) => Promise<T>;
  update: (args: { where: any; data: any }) => Promise<T>;
  delete: (args: { where: any }) => Promise<T>;
  count: (args?: { where?: any }) => Promise<number>;
  deleteMany: (args: { where: any }) => Promise<{ count: number }>;
  updateMany: (args: { where: any; data: any }) => Promise<{ count: number }>;
}

/**
 * 通用查询条件类型
 * 用于表示数据库查询条件的类型，兼容WhereCondition
 */
export type QueryCondition<T> = WhereCondition<T>;

/**
 * 通用Model对象类型
 * 表示可以被查询的模型对象
 */
export type ModelType<T = any> = {
  [K: string]: unknown;
};
