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

export class OracleAdapter extends BaseDatabaseAdapter {
  private connection?: any;

  constructor(config: DatabaseConfig) {
    super(config);
  }

  async connect(options?: ConnectionOptions): Promise<DatabaseOperationResult<void>> {
    try {
      // 动态导入 oracledb 模块
      const oracledb = await import('oracledb');
      
      const config = {
        user: this.config.username,
        password: this.config.password,
        connectString: `${this.config.host}:${this.config.port || 1521}/${this.config.database}`,
        ...this.config.options
      };

      this.connection = await oracledb.getConnection(config);
      this.isConnected = true;
      this.connectionId = `oracle_${Date.now()}`;
      this.updateLastActivity();
      
      return { success: true };
    } catch (error) {
      this.isConnected = false;
      return {
        success: false,
        error: this.createDatabaseError(
          'ORACLE_CONNECTION_FAILED',
          `Oracle connection failed: ${error instanceof Error ? error.message : String(error)}`,
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
          'ORACLE_DISCONNECT_FAILED',
          `Oracle disconnect failed: ${error instanceof Error ? error.message : String(error)}`,
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
        SELECT table_name 
        FROM user_tables 
        ORDER BY table_name
      `;

      const result = await this.connection.execute(query);
      const tables = result.rows.map((row: any) => row[0]);
      this.updateLastActivity();
      
      return { success: true, data: tables };
    } catch (error) {
      return {
        success: false,
        error: this.createDatabaseError(
          'ORACLE_GET_TABLES_FAILED',
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
          column_name as "Field",
          data_type as "Type",
          nullable as "Null",
          data_default as "Default",
          data_length as "Length",
          data_precision as "Precision",
          data_scale as "Scale"
        FROM user_tab_columns 
        WHERE table_name = :tableName
        ORDER BY column_id
      `;

      const result = await this.connection.execute(query, [tableName.toUpperCase()]);
      
      const columns: DatabaseColumn[] = result.rows.map((row: any) => ({
        name: row[0],
        type: this.mapOracleType(row[1]),
        nullable: row[2] === 'Y',
        primaryKey: false, // 需要额外查询主键信息
        autoIncrement: false, // Oracle使用序列
        defaultValue: row[3],
        maxLength: row[4],
        precision: row[5],
        scale: row[6]
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
          'ORACLE_GET_SCHEMA_FAILED',
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

      const result = await this.connection.execute(query, params as any[], {
        outFormat: 4001, // OBJECT format
        autoCommit: true
      });
      
      const duration = Date.now() - startTime;
      this.updateLastActivity();

      const queryResult: QueryResult<T> = {
        rows: result.rows as T[],
        rowCount: result.rows ? result.rows.length : 0,
        affectedRows: result.rowsAffected
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
          'ORACLE_QUERY_FAILED',
          `Query execution failed: ${error instanceof Error ? error.message : String(error)}`,
          'QUERY',
          'HIGH',
          { query, params, executionTime: duration }
        )
      };
    }
  }

  private mapOracleType(oracleType: string): import('../../types/database').DatabaseFieldType {
    const type = oracleType.toLowerCase();
    if (type.includes('varchar') || type.includes('varchar2')) return 'varchar';
    if (type.includes('char')) return 'char';
    if (type.includes('clob') || type.includes('long')) return 'text';
    if (type.includes('number')) {
      // Oracle NUMBER can be integer or decimal
      return 'decimal';
    }
    if (type.includes('date') || type.includes('timestamp')) return 'datetime';
    if (type.includes('blob') || type.includes('raw')) return 'blob';
    if (type.includes('float')) return 'float';
    return 'varchar';
  }
}