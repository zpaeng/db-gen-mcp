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

export class MSSQLAdapter extends BaseDatabaseAdapter {
  private connection?: any;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(options?: ConnectionOptions): Promise<DatabaseOperationResult<void>> {
    try {
      // 动态导入 mssql 模块
      const sql = await import('mssql');
      
      const config = {
        server: this.config.host || 'localhost',
        port: this.config.port || 1433,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          ...this.config.options
        },
        connectionTimeout: options?.timeout || 30000
      };

      this.connection = await sql.connect(config);
      this.isConnected = true;
      this.connectionId = `mssql_${Date.now()}`;
      this.updateLastActivity();
      
      return { success: true };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        error: this.createDatabaseError(
          'MSSQL_CONNECTION_FAILED',
          `MSSQL connection failed: ${error instanceof Error ? error.message : String(error)}`,
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
        await this.connection.close();
        this.connection = undefined;
        this.isConnected = false;
        this.connectionId = undefined;
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'MSSQL_DISCONNECT_FAILED',
          `MSSQL disconnect failed: ${error instanceof Error ? error.message : String(error)}`,
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
        return { success: true, data: false };
      }
      await this.disconnect();
      return { success: true, data: true };
    } catch (error) {
      return { success: true, data: false };
    }
  }

  async getTables(): Promise<DatabaseOperationResult<ReadonlyArray<string>>> {
    try {
      if (!this.connection) {
        const connectResult = await this.connect();
        if (!connectResult.success) {
          return { success: false, error: connectResult.error };
        }
      }

      const query = `
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `;

      const result = await this.connection.request().query(query);
      const tables = result.recordset.map((row: any) => row.TABLE_NAME);
      this.updateLastActivity();
      
      return { success: true, data: tables };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'MSSQL_GET_TABLES_FAILED',
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
          return { success: false, error: connectResult.error };
        }
      }

      const query = `
        SELECT 
          COLUMN_NAME as Field,
          DATA_TYPE as Type,
          IS_NULLABLE as Null,
          COLUMN_DEFAULT as Default,
          CHARACTER_MAXIMUM_LENGTH as Length,
          NUMERIC_PRECISION as Precision,
          NUMERIC_SCALE as Scale
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = @tableName
        ORDER BY ORDINAL_POSITION
      `;

      const request = this.connection.request();
      request.input('tableName', tableName);
      const result = await request.query(query);
      
      const columns: DatabaseColumn[] = result.recordset.map((col: any) => ({
        name: col.Field,
        type: this.mapMSSQLType(col.Type),
        nullable: col.Null === 'YES',
        primaryKey: false, // 需要额外查询主键信息
        autoIncrement: false, // 需要额外查询自增信息
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
          'MSSQL_GET_SCHEMA_FAILED',
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
          return { success: false, error: connectResult.error };
        }
      }

      const request = this.connection.request();
      
      // 添加参数
      if (params) {
        params.forEach((param, index) => {
          request.input(`param${index}`, param);
        });
      }

      const result = await request.query(query);
      const duration = Date.now() - startTime;
      this.updateLastActivity();

      const queryResult: QueryResult<T> = {
        rows: result.recordset as T[],
        rowCount: result.recordset.length,
        affectedRows: result.rowsAffected[0]
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
          'MSSQL_QUERY_FAILED',
          `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'HIGH',
          { query, params, executionTime: duration }
        )
      };
    }
  }

  private mapMSSQLType(mssqlType: string): import('../../types/database').DatabaseFieldType {
    const type = mssqlType.toLowerCase();
    if (type.includes('varchar') || type.includes('nvarchar') || type.includes('char')) return 'varchar';
    if (type.includes('text') || type.includes('ntext')) return 'text';
    if (type.includes('int')) return 'int';
    if (type.includes('bigint')) return 'bigint';
    if (type.includes('smallint')) return 'smallint';
    if (type.includes('tinyint')) return 'tinyint';
    if (type.includes('decimal') || type.includes('numeric')) return 'decimal';
    if (type.includes('float') || type.includes('real')) return 'float';
    if (type.includes('datetime') || type.includes('datetime2')) return 'datetime';
    if (type.includes('date')) return 'date';
    if (type.includes('time')) return 'time';
    if (type.includes('bit')) return 'boolean';
    if (type.includes('binary') || type.includes('varbinary')) return 'binary';
    if (type.includes('uniqueidentifier')) return 'uuid';
    return 'varchar';
  }
}