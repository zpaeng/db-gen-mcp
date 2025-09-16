import { BaseDatabaseAdapter } from './base';
import { DatabaseConfig } from '../../types';
import { 
  ConnectionOptions, 
  QueryOptions, 
  QueryParameter 
} from '../../types/adapters';
import { 
  DatabaseTable, 
  DatabaseColumn, 
  QueryResult, 
  DatabaseOperationResult 
} from '../../types/database';

export class SQLiteAdapter extends BaseDatabaseAdapter {
  private db?: any;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(options?: ConnectionOptions): Promise<DatabaseOperationResult<void>> {
    try {
      // 动态导入 sqlite3 模块
      const sqlite3 = await import('sqlite3');
      
      return new Promise((resolve, reject) => {
        this.db = new sqlite3.Database(this.config.filename || this.config.database, (err: any) => {
          if (err) {
            this.isConnected = false;
            resolve({
              success: false,
              error: this.createDatabaseError(
                'SQLITE_CONNECTION_FAILED',
                `SQLite connection failed: ${err.message}`,
                'CONNECTION',
                'HIGH',
                { filename: this.config.filename || this.config.database }
              )
            });
          } else {
            this.isConnected = true;
            this.connectionId = `sqlite_${Date.now()}`;
            this.updateLastActivity();
            resolve({ success: true });
          }
        });
      });
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        error: this.createDatabaseError(
          'SQLITE_CONNECTION_FAILED',
          `SQLite connection failed: ${error instanceof Error ? error.message : String(error)}`,
          'CONNECTION',
          'HIGH',
          { filename: this.config.filename || this.config.database }
        )
      };
    }
  }

  async disconnect(): Promise<DatabaseOperationResult<void>> {
    try {
      if (this.db) {
        return new Promise((resolve) => {
          this.db.close((err: any) => {
            if (err) {
              resolve({
                success: false,
                error: this.createDatabaseError(
                  'SQLITE_DISCONNECT_FAILED',
                  `SQLite disconnect failed: ${err.message}`,
                  'CONNECTION',
                  'MEDIUM'
                )
              });
            } else {
              this.db = undefined;
              this.isConnected = false;
              this.connectionId = undefined;
              resolve({ success: true });
            }
          });
        });
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'SQLITE_DISCONNECT_FAILED',
          `SQLite disconnect failed: ${error instanceof Error ? error.message : String(error)}`,
          'CONNECTION',
          'MEDIUM'
        )
      };
    }
  }

  async testConnection(): Promise<DatabaseOperationResult<boolean>> {
    try {
      if (!this.db) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return { success: true, data: false };
        }
      }
      
      return new Promise((resolve) => {
        this.db.get('SELECT 1 as test', (err: any, row: any) => {
          resolve({ success: true, data: !err && row });
        });
      });
    } catch (error) {
      return { success: true, data: false };
    }
  }

  async getTables(): Promise<DatabaseOperationResult<ReadonlyArray<string>>> {
    try {
      if (!this.db) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return { success: false, error: connectResult.error };
        }
      }
      
      const query = `
        SELECT name 
        FROM sqlite_master 
        WHERE type = 'table' 
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `;
      
      return new Promise((resolve) => {
        this.db.all(query, (err: any, rows: any[]) => {
          if (err) {
            resolve({
              success: false,
              error: this.createDatabaseError(
                'SQLITE_GET_TABLES_FAILED',
                `Failed to get tables: ${err.message}`,
                'QUERY',
                'MEDIUM'
              )
            });
          } else {
            this.updateLastActivity();
            resolve({
              success: true,
              data: rows.map(row => row.name)
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'SQLITE_GET_TABLES_FAILED',
          `Failed to get tables: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'MEDIUM'
        )
      };
    }
  }

  async getTableSchema(tableName: string): Promise<DatabaseOperationResult<DatabaseTable>> {
    try {
      if (!this.db) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return { success: false, error: connectResult.error };
        }
      }
      
      const query = `PRAGMA table_info(${tableName})`;
      
      return new Promise((resolve) => {
        this.db.all(query, (err: any, rows: any[]) => {
          if (err) {
            resolve({
              success: false,
              error: this.createDatabaseError(
                'SQLITE_GET_SCHEMA_FAILED',
                `Failed to get table schema: ${err.message}`,
                'QUERY',
                'MEDIUM',
                { tableName }
              )
            });
          } else {
            const columns: DatabaseColumn[] = rows.map(row => ({
              name: row.name,
              type: this.mapSQLiteType(row.type),
              nullable: !row.notnull,
              primaryKey: !!row.pk,
              autoIncrement: row.type.toLowerCase().includes('integer') && !!row.pk,
              defaultValue: row.dflt_value
            }));
            
            this.updateLastActivity();
            resolve({
              success: true,
              data: {
                name: tableName,
                columns,
                indexes: [],
                constraints: []
              }
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'SQLITE_GET_SCHEMA_FAILED',
          `Failed to get table schema: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'MEDIUM',
          { tableName }
        )
      };
    }
  }

  async execute<T = Record<string, unknown>>(
    query: string, 
    params?: ReadonlyArray<QueryParameter>,
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<QueryResult<T>>> {
    const startTime = Date.now();
    try {
      if (!this.db) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return { success: false, error: connectResult.error };
        }
      }
      
      return new Promise((resolve) => {
        // 判断是否为查询语句
        const isSelect = query.trim().toLowerCase().startsWith('select');
        
        if (isSelect) {
          this.db.all(query, params as any[], (err: any, rows: any[]) => {
            const duration = Date.now() - startTime;
            if (err) {
              resolve({
                success: false,
                error: this.createDatabaseError(
                  'SQLITE_QUERY_FAILED',
                  `Query execution failed: ${err.message}`,
                  'QUERY',
                  'HIGH',
                  { query, params, executionTime: duration }
                )
              });
            } else {
              this.updateLastActivity();
              const queryResult: QueryResult<T> = {
                rows: rows as T[],
                rowCount: rows.length
              };
              
              resolve({
                success: true,
                data: queryResult,
                stats: {
                  executionTime: duration,
                  rowsReturned: queryResult.rowCount
                }
              });
            }
          });
        } else {
          this.db.run(query, params as any[], function(this: any, err: any) {
            const duration = Date.now() - startTime;
            if (err) {
              resolve({
                success: false,
                error: {
                  code: 'SQLITE_QUERY_FAILED',
                  message: `Query execution failed: ${err.message}`,
                  category: 'QUERY',
                  level: 'HIGH',
                  timestamp: new Date(),
                  query,
                  parameters: params,
                  databaseType: 'sqlite'
                }
              });
            } else {
              const queryResult: QueryResult<T> = {
                rows: [],
                rowCount: 0,
                affectedRows: this.changes,
                insertId: this.lastID
              };
              
              resolve({
                success: true,
                data: queryResult,
                stats: {
                  executionTime: duration,
                  rowsReturned: queryResult.rowCount
                }
              });
            }
          });
        }
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: this.createDatabaseError(
          'SQLITE_QUERY_FAILED',
          `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'HIGH',
          { query, params, executionTime: duration }
        )
      };
    }
  }

  private mapSQLiteType(sqliteType: string): import('../../types/database').DatabaseFieldType {
    const type = sqliteType.toLowerCase();
    if (type.includes('int')) return 'int';
    if (type.includes('text') || type.includes('varchar') || type.includes('char')) return 'text';
    if (type.includes('real') || type.includes('float') || type.includes('double')) return 'float';
    if (type.includes('blob')) return 'blob';
    if (type.includes('numeric') || type.includes('decimal')) return 'decimal';
    return 'text';
  }
}