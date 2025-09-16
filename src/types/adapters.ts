/**
 * 数据库适配器接口的严格类型定义
 */

import { DatabaseConfig, DatabaseType } from './index';
import { 
  DatabaseTable, 
  DatabaseColumn, 
  QueryResult, 
  ConnectionStatus, 
  TransactionInfo,
  DatabaseOperationResult,
  BatchOperationResult
} from './database';
import { DatabaseError, ConnectionError, QueryError } from './errors';

// 查询参数类型
export type QueryParameter = string | number | boolean | Date | null | Buffer;

// 查询选项
export interface QueryOptions {
  readonly timeout?: number;
  readonly maxRows?: number;
  readonly fetchSize?: number;
  readonly autoCommit?: boolean;
  readonly resultFormat?: 'array' | 'object';
}

// 连接选项
export interface ConnectionOptions {
  readonly timeout?: number;
  readonly retries?: number;
  readonly retryDelay?: number;
  readonly poolSize?: number;
  readonly maxIdleTime?: number;
  readonly validateConnection?: boolean;
}

// 事务选项
export interface TransactionOptions {
  readonly isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readonly timeout?: number;
  readonly readOnly?: boolean;
  readonly autoCommit?: boolean;
}

// 批量操作选项
export interface BatchOptions {
  readonly batchSize?: number;
  readonly continueOnError?: boolean;
  readonly timeout?: number;
  readonly parallel?: boolean;
}

// 数据库适配器核心接口
export interface IDatabaseAdapter {
  // 连接管理
  connect(options?: ConnectionOptions): Promise<DatabaseOperationResult<void>>;
  disconnect(): Promise<DatabaseOperationResult<void>>;
  testConnection(): Promise<DatabaseOperationResult<boolean>>;
  getConnectionStatus(): Promise<DatabaseOperationResult<ConnectionStatus>>;
  
  // 查询执行
  execute<T = Record<string, unknown>>(
    query: string, 
    params?: ReadonlyArray<QueryParameter>,
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<QueryResult<T>>>;
  
  // 元数据查询
  getTables(): Promise<DatabaseOperationResult<ReadonlyArray<string>>>;
  getTableSchema(tableName: string): Promise<DatabaseOperationResult<DatabaseTable>>;
  getColumns(tableName: string): Promise<DatabaseOperationResult<ReadonlyArray<DatabaseColumn>>>;
  
  // 事务管理
  beginTransaction(options?: TransactionOptions): Promise<DatabaseOperationResult<TransactionInfo>>;
  commitTransaction(transactionId: string): Promise<DatabaseOperationResult<void>>;
  rollbackTransaction(transactionId: string): Promise<DatabaseOperationResult<void>>;
  
  // 批量操作
  executeBatch<T = Record<string, unknown>>(
    queries: ReadonlyArray<{ query: string; params?: ReadonlyArray<QueryParameter> }>,
    options?: BatchOptions
  ): Promise<BatchOperationResult<QueryResult<T>>>;
  
  // 健康检查
  healthCheck(): Promise<DatabaseOperationResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  }>>;
}

// 扩展的数据库适配器接口（包含高级功能）
export interface IAdvancedDatabaseAdapter extends IDatabaseAdapter {
  // 连接池管理
  getPoolStatus(): Promise<DatabaseOperationResult<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
  }>>;
  
  // 性能监控
  getPerformanceMetrics(): Promise<DatabaseOperationResult<{
    averageQueryTime: number;
    slowQueries: ReadonlyArray<{
      query: string;
      executionTime: number;
      timestamp: Date;
    }>;
    connectionMetrics: {
      totalConnections: number;
      failedConnections: number;
      averageConnectionTime: number;
    };
  }>>;
  
  // 查询计划
  explainQuery(query: string, params?: ReadonlyArray<QueryParameter>): Promise<DatabaseOperationResult<{
    plan: string;
    cost: number;
    estimatedRows: number;
  }>>;
  
  // 数据库特定功能
  executeStoredProcedure<T = Record<string, unknown>>(
    procedureName: string,
    params?: ReadonlyArray<QueryParameter>
  ): Promise<DatabaseOperationResult<QueryResult<T>>>;
  
  // 备份和恢复
  createBackup(options?: {
    tables?: ReadonlyArray<string>;
    compression?: boolean;
    encryption?: boolean;
  }): Promise<DatabaseOperationResult<{
    backupId: string;
    size: number;
    location: string;
  }>>;
}

// 数据库适配器工厂接口
export interface IDatabaseAdapterFactory {
  createAdapter(config: DatabaseConfig): IDatabaseAdapter;
  getSupportedTypes(): ReadonlyArray<DatabaseType>;
  validateConfig(config: DatabaseConfig): DatabaseOperationResult<void>;
}

// 适配器注册信息
export interface AdapterRegistration {
  readonly type: DatabaseType;
  readonly adapterClass: new (config: DatabaseConfig) => IDatabaseAdapter;
  readonly version: string;
  readonly features: ReadonlyArray<string>;
  readonly dependencies: ReadonlyArray<string>;
}

// 适配器管理器接口
export interface IDatabaseAdapterManager {
  registerAdapter(registration: AdapterRegistration): void;
  unregisterAdapter(type: DatabaseType): void;
  getAdapter(config: DatabaseConfig): IDatabaseAdapter;
  getRegisteredAdapters(): ReadonlyArray<AdapterRegistration>;
  validateAdapterCompatibility(type: DatabaseType, version: string): boolean;
}

// 连接池接口
export interface IConnectionPool {
  getConnection(config: DatabaseConfig): Promise<IDatabaseAdapter>;
  releaseConnection(config: DatabaseConfig, adapter: IDatabaseAdapter): Promise<void>;
  closeAllConnections(): Promise<void>;
  getPoolStatistics(): {
    totalPools: number;
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  };
}

// 查询缓存接口
export interface IQueryCache {
  get<T>(key: string): Promise<QueryResult<T> | null>;
  set<T>(key: string, result: QueryResult<T>, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  clear(): Promise<void>;
  getStatistics(): {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
}

// 数据库迁移接口
export interface IDatabaseMigration {
  readonly version: string;
  readonly description: string;
  readonly up: (adapter: IDatabaseAdapter) => Promise<void>;
  readonly down: (adapter: IDatabaseAdapter) => Promise<void>;
}

// 迁移管理器接口
export interface IMigrationManager {
  addMigration(migration: IDatabaseMigration): void;
  migrate(targetVersion?: string): Promise<void>;
  rollback(targetVersion?: string): Promise<void>;
  getCurrentVersion(): Promise<string>;
  getPendingMigrations(): ReadonlyArray<IDatabaseMigration>;
}