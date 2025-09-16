export type DatabaseType = 'mysql' | 'postgresql' | 'mssql' | 'oracle' | 'sqlite';

export interface DatabaseConfig {
  readonly type: DatabaseType;
  readonly host?: string;
  readonly port?: number;
  readonly database: string;
  readonly username?: string;
  readonly password?: string;
  readonly filename?: string; // for SQLite
  readonly options?: Readonly<Record<string, unknown>>;
}

export interface CodeGenConfig {
  readonly packageName: string;
  readonly author?: string;
  readonly tablePrefix?: string;
  readonly entitySuffix?: string;
  readonly outputPath: string;
  readonly enableSwagger?: boolean;
  readonly enableValidation?: boolean;
}

// 导出所有类型定义
export * from './database';
export * from './errors';
export * from './adapters';
export * from './query';