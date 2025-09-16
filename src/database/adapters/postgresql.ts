import { Pool, PoolClient } from 'pg';
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

export class PostgreSQLAdapter extends BaseDatabaseAdapter {
  private pool?: Pool;
  private client?: PoolClient;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(options?: ConnectionOptions): Promise<DatabaseOperationResult<void>> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port || 5432,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        connectionTimeoutMillis: options?.timeout || 30000,
        max: options?.poolSize || 10,
        idleTimeoutMillis: options?.maxIdleTime || 30000,
        ...this.config.options
      });

      // 测试连接
      this.client = await this.pool.connect();
      this.isConnected = true;
      this.connectionId = `postgresql_${Date.now()}`;
      this.updateLastActivity();
      
      return { success: true };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        error: this.createDatabaseError(
          'POSTGRESQL_CONNECTION_FAILED',
          `PostgreSQL connection failed: ${error instanceof Error ? error.message : String(error)}`,
          'CONNECTION',
          'HIGH',
          { host: this.config.host, database: this.config.database }
        )
      };
    }
  }

  async disconnect(): Promise<DatabaseOperationResult<void>> {
    try {
      if (this.client) {
        this.client.release();
        this.client = undefined;
      }
      if (this.pool) {
        await this.pool.end();
        this.pool = undefined;
      }
      this.isConnected = false;
      this.connectionId = undefined;
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'POSTGRESQL_DISCONNECT_FAILED',
          `PostgreSQL disconnect failed: ${error instanceof Error ? error.message : String(error)}`,
          'CONNECTION',
          'MEDIUM'
        )
      };
    }
  }

  async testConnection(): Promise<DatabaseOperationResult<boolean>> {
    try {
      if (!this.pool) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return {
            success: true,
            data: false
          };
        }
      }
      const result = await this.pool!.query('SELECT 1 as test');
      return {
        success: true,
        data: result.rows.length > 0
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
      if (!this.pool) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return {
            success: false,
            error: connectResult.error
          };
        }
      }
      
      const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const result = await this.pool!.query(query);
      const tables = result.rows.map((row: any) => row.table_name);
      this.updateLastActivity();
      
      return {
        success: true,
        data: tables
      };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'POSTGRESQL_GET_TABLES_FAILED',
          `Failed to get tables: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'MEDIUM'
        )
      };
    }
  }

  async getTableSchema(tableName: string): Promise<DatabaseOperationResult<DatabaseTable>> {
    try {
      if (!this.pool) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return {
            success: false,
            error: connectResult.error
          };
        }
      }
      
      const query = `
        SELECT
          column_name as "Field",
          data_type as "Type",
          is_nullable as "Null",
          column_default as "Default",
          character_maximum_length as "Length",
          numeric_precision as "Precision",
          numeric_scale as "Scale",
          CASE
            WHEN column_name IN (
              SELECT column_name
              FROM information_schema.key_column_usage
              WHERE table_name = $1
              AND constraint_name IN (
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = $1
                AND constraint_type = 'PRIMARY KEY'
              )
            ) THEN 'PRI'
            ELSE ''
          END as "Key"
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      
      const result = await this.pool!.query(query, [tableName]);
      const pgColumns = result.rows;
      
      const columns: DatabaseColumn[] = pgColumns.map((col: any) => ({
        name: col.Field,
        type: this.mapPostgreSQLType(col.Type),
        nullable: col.Null === 'YES',
        primaryKey: col.Key === 'PRI',
        autoIncrement: col.Default?.includes('nextval') || false,
        defaultValue: col.Default,
        maxLength: col.Length,
        precision: col.Precision,
        scale: col.Scale
      }));
      
      this.updateLastActivity();
      
      return {
        success: true,
        data: {
          name: tableName,
          columns,
          indexes: [],
          constraints: []
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'POSTGRESQL_GET_SCHEMA_FAILED',
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
      if (!this.pool) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return {
            success: false,
            error: connectResult.error
          };
        }
      }
      
      const result = await this.pool!.query(query, params as any[]);
      const duration = Date.now() - startTime;
      this.updateLastActivity();
      
      const queryResult: QueryResult<T> = {
        rows: result.rows as T[],
        rowCount: result.rowCount || 0,
        affectedRows: result.rowCount ?? undefined
      };
      
      return {
        success: true,
        data: queryResult,
        stats: {
          executionTime: duration,
          rowsReturned: queryResult.rowCount
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: this.createDatabaseError(
          'POSTGRESQL_QUERY_FAILED',
          `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'HIGH',
          { query, params, executionTime: duration }
        )
      };
    }
  }

  private mapPostgreSQLType(pgType: string): import('../../types/database').DatabaseFieldType {
    const type = pgType.toLowerCase();
    if (type.includes('varchar') || type.includes('character varying')) return 'varchar';
    if (type.includes('char')) return 'char';
    if (type.includes('text')) return 'text';
    if (type.includes('integer') || type.includes('int')) return 'int';
    if (type.includes('bigint')) return 'bigint';
    if (type.includes('smallint')) return 'smallint';
    if (type.includes('decimal') || type.includes('numeric')) return 'decimal';
    if (type.includes('real') || type.includes('float')) return 'float';
    if (type.includes('double')) return 'double';
    if (type.includes('date')) return 'date';
    if (type.includes('timestamp')) return 'timestamp';
    if (type.includes('time')) return 'time';
    if (type.includes('boolean')) return 'boolean';
    if (type.includes('json')) return 'json';
    if (type.includes('bytea')) return 'blob';
    if (type.includes('uuid')) return 'uuid';
    return 'varchar';
  }
}