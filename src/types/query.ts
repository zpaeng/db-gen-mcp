/**
 * 查询相关的严格类型定义
 */

import { QueryParameter } from './adapters';
import { DatabaseError } from './errors';

// 查询操作符
export type QueryOperator = 
  | '=' | '!=' | '<>' | '>' | '<' | '>=' | '<='
  | 'LIKE' | 'NOT LIKE' | 'ILIKE' | 'NOT ILIKE'
  | 'IN' | 'NOT IN'
  | 'IS NULL' | 'IS NOT NULL'
  | 'EXISTS' | 'NOT EXISTS'
  | 'BETWEEN' | 'NOT BETWEEN'
  | 'REGEXP' | 'NOT REGEXP';

// 连接类型
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';

// 排序方向
export type SortDirection = 'ASC' | 'DESC';

// 聚合函数
export type AggregateFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'GROUP_CONCAT';

// 查询条件
export interface QueryCondition {
  readonly field: string;
  readonly operator: QueryOperator;
  readonly value?: QueryParameter | ReadonlyArray<QueryParameter>;
  readonly logicalOperator?: 'AND' | 'OR';
}

// 连接条件
export interface JoinCondition {
  readonly type: JoinType;
  readonly table: string;
  readonly alias?: string;
  readonly on: string;
  readonly conditions?: ReadonlyArray<QueryCondition>;
}

// 排序条件
export interface OrderCondition {
  readonly field: string;
  readonly direction: SortDirection;
  readonly nullsFirst?: boolean;
}

// 分组条件
export interface GroupCondition {
  readonly fields: ReadonlyArray<string>;
  readonly having?: ReadonlyArray<QueryCondition>;
}

// 子查询
export interface SubQuery {
  readonly query: string;
  readonly params: ReadonlyArray<QueryParameter>;
  readonly alias?: string;
}

// 查询选择字段
export interface SelectField {
  readonly field: string;
  readonly alias?: string;
  readonly aggregate?: AggregateFunction;
  readonly distinct?: boolean;
}

// 查询构建选项
export interface QueryBuildOptions {
  readonly escapeIdentifiers?: boolean;
  readonly validateSyntax?: boolean;
  readonly optimizeQuery?: boolean;
  readonly includeComments?: boolean;
}

// 查询构建结果
export interface QueryBuildResult {
  readonly query: string;
  readonly params: ReadonlyArray<QueryParameter>;
  readonly parameterMap?: Record<string, QueryParameter>;
  readonly estimatedCost?: number;
  readonly warnings?: ReadonlyArray<string>;
}

// 查询验证结果
export interface QueryValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<DatabaseError>;
  readonly warnings: ReadonlyArray<string>;
  readonly suggestions?: ReadonlyArray<string>;
}

// 查询统计信息
export interface QueryStatistics {
  readonly totalQueries: number;
  readonly successfulQueries: number;
  readonly failedQueries: number;
  readonly averageExecutionTime: number;
  readonly slowQueries: ReadonlyArray<{
    query: string;
    executionTime: number;
    timestamp: Date;
  }>;
  readonly mostFrequentQueries: ReadonlyArray<{
    query: string;
    count: number;
    averageTime: number;
  }>;
}

// 查询缓存键
export interface QueryCacheKey {
  readonly query: string;
  readonly params: ReadonlyArray<QueryParameter>;
  readonly database: string;
  readonly schema?: string;
}

// 查询执行计划
export interface QueryExecutionPlan {
  readonly steps: ReadonlyArray<{
    operation: string;
    table?: string;
    index?: string;
    cost: number;
    rows: number;
    time: number;
  }>;
  readonly totalCost: number;
  readonly estimatedRows: number;
  readonly estimatedTime: number;
}

// 查询优化建议
export interface QueryOptimizationSuggestion {
  readonly type: 'INDEX' | 'REWRITE' | 'PARTITION' | 'CACHE';
  readonly description: string;
  readonly impact: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly effort: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly estimatedImprovement?: number;
}

// 批量查询操作
export interface BatchQueryOperation {
  readonly query: string;
  readonly params?: ReadonlyArray<QueryParameter>;
  readonly priority?: 'LOW' | 'NORMAL' | 'HIGH';
  readonly timeout?: number;
}

// 事务查询操作
export interface TransactionQueryOperation extends BatchQueryOperation {
  readonly rollbackOnError?: boolean;
  readonly savepoint?: string;
}

// 查询构建器状态
export interface QueryBuilderState {
  readonly selectFields: ReadonlyArray<SelectField>;
  readonly fromTable?: string;
  readonly fromAlias?: string;
  readonly joins: ReadonlyArray<JoinCondition>;
  readonly whereConditions: ReadonlyArray<QueryCondition>;
  readonly groupBy?: GroupCondition;
  readonly orderBy: ReadonlyArray<OrderCondition>;
  readonly limit?: number;
  readonly offset?: number;
  readonly distinct?: boolean;
  readonly forUpdate?: boolean;
}

// 查询类型
export type QueryType = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP';

// 查询元数据
export interface QueryMetadata {
  readonly type: QueryType;
  readonly tables: ReadonlyArray<string>;
  readonly fields: ReadonlyArray<string>;
  readonly hasSubqueries: boolean;
  readonly hasJoins: boolean;
  readonly hasAggregates: boolean;
  readonly complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  readonly estimatedRows?: number;
}

// 查询安全检查结果
export interface QuerySecurityCheck {
  readonly safe: boolean;
  readonly risks: ReadonlyArray<{
    type: 'SQL_INJECTION' | 'PRIVILEGE_ESCALATION' | 'DATA_EXPOSURE' | 'PERFORMANCE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    recommendation: string;
  }>;
  readonly sanitizedQuery?: string;
  readonly sanitizedParams?: ReadonlyArray<QueryParameter>;
}