/**
 * 数据库相关的严格类型定义
 */

import { DatabaseError } from './errors';

// 数据库字段类型映射
export type DatabaseFieldType = 
  | 'varchar' | 'char' | 'text' | 'longtext' | 'mediumtext' | 'tinytext'
  | 'int' | 'bigint' | 'smallint' | 'tinyint' | 'mediumint'
  | 'decimal' | 'numeric' | 'float' | 'double'
  | 'date' | 'datetime' | 'timestamp' | 'time' | 'year'
  | 'boolean' | 'bit'
  | 'json' | 'blob' | 'longblob' | 'mediumblob' | 'tinyblob'
  | 'enum' | 'set'
  | 'uuid' | 'binary' | 'varbinary';

// 数据库字段定义
export interface DatabaseColumn {
  readonly name: string;
  readonly type: DatabaseFieldType;
  readonly nullable: boolean;
  readonly primaryKey: boolean;
  readonly autoIncrement: boolean;
  readonly defaultValue?: string | number | boolean | null;
  readonly maxLength?: number;
  readonly precision?: number;
  readonly scale?: number;
  readonly comment?: string;
  readonly foreignKey?: {
    table: string;
    column: string;
  };
}

// 数据库表结构定义
export interface DatabaseTable {
  readonly name: string;
  readonly columns: ReadonlyArray<DatabaseColumn>;
  readonly indexes: ReadonlyArray<DatabaseIndex>;
  readonly constraints: ReadonlyArray<DatabaseConstraint>;
  readonly comment?: string;
}

// 数据库索引定义
export interface DatabaseIndex {
  readonly name: string;
  readonly columns: ReadonlyArray<string>;
  readonly unique: boolean;
  readonly type: 'BTREE' | 'HASH' | 'FULLTEXT' | 'SPATIAL';
}

// 数据库约束定义
export interface DatabaseConstraint {
  readonly name: string;
  readonly type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  readonly columns: ReadonlyArray<string>;
  readonly referencedTable?: string;
  readonly referencedColumns?: ReadonlyArray<string>;
  readonly onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  readonly onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

// 查询结果类型
export interface QueryResult<T = Record<string, unknown>> {
  readonly rows: ReadonlyArray<T>;
  readonly rowCount: number;
  readonly affectedRows?: number;
  readonly insertId?: string | number;
  readonly fields?: ReadonlyArray<DatabaseColumn>;
}

// 查询执行统计
export interface QueryStats {
  readonly executionTime: number;
  readonly rowsExamined?: number;
  readonly rowsReturned: number;
  readonly queryPlan?: string;
}

// 连接状态
export interface ConnectionStatus {
  readonly connected: boolean;
  readonly connectionId?: string;
  readonly serverVersion?: string;
  readonly lastActivity: Date;
  readonly activeQueries: number;
}

// 事务状态
export type TransactionStatus = 'ACTIVE' | 'COMMITTED' | 'ROLLED_BACK' | 'FAILED';

export interface TransactionInfo {
  readonly id: string;
  readonly status: TransactionStatus;
  readonly startTime: Date;
  readonly isolationLevel: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
}

// 数据库操作结果
export interface DatabaseOperationResult<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: DatabaseError;
  readonly stats?: QueryStats;
  readonly warnings?: ReadonlyArray<string>;
}

// 批量操作结果
export interface BatchOperationResult<T = unknown> {
  readonly totalOperations: number;
  readonly successfulOperations: number;
  readonly failedOperations: number;
  readonly results: ReadonlyArray<DatabaseOperationResult<T>>;
  readonly errors: ReadonlyArray<DatabaseError>;
}