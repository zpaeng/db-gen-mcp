import mysql from 'mysql2/promise';
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
import { logger } from '../../utils/logger';

export class MySqlAdapter extends BaseDatabaseAdapter {
  private connection: mysql.Connection | null = null;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(options?: ConnectionOptions): Promise<DatabaseOperationResult<void>> {
    try {
      logger.debug('Connecting to MySQL database', { host: this.config.host, database: this.config.database });
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        connectTimeout: options?.timeout || 30000,
      });
      this.isConnected = true;
      this.connectionId = `mysql_${Date.now()}`;
      this.updateLastActivity();
      logger.logConnection('connect', 'mysql', this.config.host);
      
      return { success: true };
    } catch (error) {
      logger.logConnection('error', 'mysql', this.config.host);
      this.isConnected = false;
      return {
        success: false,
        error: this.createDatabaseError(
          'MYSQL_CONNECTION_FAILED',
          `Failed to connect to MySQL: ${error instanceof Error ? error.message : String(error)}`,
          'CONNECTION',
          'HIGH',
          { host: this.config.host, database: this.config.database }
        )
      };
    }
  }

  async disconnect(): Promise<DatabaseOperationResult<void>> {
    try {
      if (this.connection) {
        logger.debug('Disconnecting from MySQL database');
        await this.connection.end();
        this.connection = null;
        this.isConnected = false;
        this.connectionId = undefined;
        logger.logConnection('disconnect', 'mysql', this.config.host);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'MYSQL_DISCONNECT_FAILED',
          `Failed to disconnect from MySQL: ${error instanceof Error ? error.message : String(error)}`,
          'CONNECTION',
          'MEDIUM'
        )
      };
    }
  }

  async testConnection(): Promise<DatabaseOperationResult<boolean>> {
    try {
      const connectResult = await this.connect();
      if (!connectResult.success) {
        return {
          success: true,
          data: false
        };
      }
      await this.disconnect();
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: true,
        data: false
      };
    }
  }

  async getTables(): Promise<DatabaseOperationResult<ReadonlyArray<string>>> {
    try {
      if (!this.connection) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return {
            success: false,
            error: connectResult.error
          };
        }
      }
      
      const [rows] = await this.connection!.execute('SHOW TABLES');
      const tables = (rows as any[]).map(row => Object.values(row)[0] as string);
      this.updateLastActivity();
      
      return {
        success: true,
        data: tables
      };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'MYSQL_GET_TABLES_FAILED',
          `Failed to get tables: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'MEDIUM'
        )
      };
    }
  }

  async getTableSchema(tableName: string): Promise<DatabaseOperationResult<DatabaseTable>> {
    try {
      if (!this.connection) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return {
            success: false,
            error: connectResult.error
          };
        }
      }
      
      const [rows] = await this.connection!.execute(`DESCRIBE \`${tableName}\``);
      const mysqlColumns = rows as any[];
      
      const columns: DatabaseColumn[] = mysqlColumns.map(col => ({
        name: col.Field,
        type: this.mapMySQLType(col.Type),
        nullable: col.Null === 'YES',
        primaryKey: col.Key === 'PRI',
        autoIncrement: col.Extra?.includes('auto_increment') || false,
        defaultValue: col.Default,
        comment: col.Comment
      }));
      
      this.updateLastActivity();
      
      return {
        success: true,
        data: {
          name: tableName,
          columns,
          indexes: [], // 可以扩展以获取索引信息
          constraints: [] // 可以扩展以获取约束信息
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'MYSQL_GET_SCHEMA_FAILED',
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
      if (!this.connection) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return {
            success: false,
            error: connectResult.error
          };
        }
      }
      
      logger.debug('Executing MySQL query', { query, params });
      const [rows, fields] = await this.connection!.execute(query, params as any[]);
      const duration = Date.now() - startTime;
      this.updateLastActivity();
      
      logger.logPerformance('mysql_query', duration);
      
      const result: QueryResult<T> = {
        rows: Array.isArray(rows) ? rows as T[] : [],
        rowCount: Array.isArray(rows) ? rows.length : 0,
        affectedRows: (rows as any)?.affectedRows,
        insertId: (rows as any)?.insertId
      };
      
      return {
        success: true,
        data: result,
        stats: {
          executionTime: duration,
          rowsReturned: result.rowCount
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('MySQL query failed', error, 'MYSQL');
      logger.logPerformance('mysql_query_failed', duration);
      
      return {
        success: false,
        error: this.createDatabaseError(
          'MYSQL_QUERY_FAILED',
          `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'HIGH',
          { query, params, executionTime: duration }
        )
      };
    }
  }

  private mapMySQLType(mysqlType: string): import('../../types/database').DatabaseFieldType {
    const type = mysqlType.toLowerCase();
    if (type.includes('varchar') || type.includes('char')) return 'varchar';
    if (type.includes('text')) return 'text';
    if (type.includes('int')) return 'int';
    if (type.includes('decimal') || type.includes('numeric')) return 'decimal';
    if (type.includes('float')) return 'float';
    if (type.includes('double')) return 'double';
    if (type.includes('date')) return 'date';
    if (type.includes('datetime')) return 'datetime';
    if (type.includes('timestamp')) return 'timestamp';
    if (type.includes('time')) return 'time';
    if (type.includes('boolean') || type.includes('bool')) return 'boolean';
    if (type.includes('json')) return 'json';
    if (type.includes('blob')) return 'blob';
    return 'varchar'; // 默认类型
  }
}