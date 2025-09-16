import { DatabaseConfig } from '../../types';
import {
  IDatabaseAdapter,
  QueryParameter,
  ConnectionOptions,
  QueryOptions
} from '../../types/adapters';
import {
  DatabaseTable,
  QueryResult,
  ConnectionStatus,
  TransactionInfo,
  DatabaseOperationResult,
  BatchOperationResult
} from '../../types/database';
import { DatabaseError } from '../../types/errors';

export abstract class BaseDatabaseAdapter implements IDatabaseAdapter {
  protected readonly config: DatabaseConfig;
  protected isConnected: boolean = false;
  protected connectionId?: string;
  protected lastActivity: Date = new Date();

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // 抽象方法 - 子类必须实现
  abstract connect(options?: ConnectionOptions): Promise<DatabaseOperationResult<void>>;
  abstract disconnect(): Promise<DatabaseOperationResult<void>>;
  abstract testConnection(): Promise<DatabaseOperationResult<boolean>>;
  abstract getTables(): Promise<DatabaseOperationResult<ReadonlyArray<string>>>;
  abstract getTableSchema(tableName: string): Promise<DatabaseOperationResult<DatabaseTable>>;
  abstract execute<T = Record<string, unknown>>(
    query: string,
    params?: ReadonlyArray<QueryParameter>,
    options?: QueryOptions
  ): Promise<DatabaseOperationResult<QueryResult<T>>>;

  // 默认实现
  async getColumns(tableName: string): Promise<DatabaseOperationResult<ReadonlyArray<import('../../types/database').DatabaseColumn>>> {
    try {
      const tableResult = await this.getTableSchema(tableName);
      if (!tableResult.success || !tableResult.data) {
        return {
          success: false,
          error: tableResult.error || {
            code: 'TABLE_NOT_FOUND',
            message: `Table ${tableName} not found`,
            category: 'QUERY',
            level: 'MEDIUM',
            timestamp: new Date()
          }
        };
      }
      return {
        success: true,
        data: tableResult.data.columns
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_COLUMNS_FAILED',
          message: `Failed to get columns for table ${tableName}: ${error instanceof Error ? error.message : String(error)}`,
          category: 'QUERY',
          level: 'MEDIUM',
          timestamp: new Date(),
          cause: error instanceof Error ? error : undefined
        }
      };
    }
  }

  async getConnectionStatus(): Promise<DatabaseOperationResult<ConnectionStatus>> {
    try {
      return {
        success: true,
        data: {
          connected: this.isConnected,
          connectionId: this.connectionId,
          lastActivity: this.lastActivity,
          activeQueries: 0 // 子类可以重写以提供实际值
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_STATUS_FAILED',
          message: `Failed to get connection status: ${error instanceof Error ? error.message : String(error)}`,
          category: 'CONNECTION',
          level: 'LOW',
          timestamp: new Date(),
          cause: error instanceof Error ? error : undefined
        }
      };
    }
  }

  async beginTransaction(options?: import('../../types/adapters').TransactionOptions): Promise<DatabaseOperationResult<TransactionInfo>> {
    return {
      success: false,
      error: {
        code: 'TRANSACTION_NOT_SUPPORTED',
        message: 'Transaction support not implemented in base adapter',
        category: 'QUERY',
        level: 'MEDIUM',
        timestamp: new Date()
      }
    };
  }

  async commitTransaction(transactionId: string): Promise<DatabaseOperationResult<void>> {
    return {
      success: false,
      error: {
        code: 'TRANSACTION_NOT_SUPPORTED',
        message: 'Transaction support not implemented in base adapter',
        category: 'QUERY',
        level: 'MEDIUM',
        timestamp: new Date()
      }
    };
  }

  async rollbackTransaction(transactionId: string): Promise<DatabaseOperationResult<void>> {
    return {
      success: false,
      error: {
        code: 'TRANSACTION_NOT_SUPPORTED',
        message: 'Transaction support not implemented in base adapter',
        category: 'QUERY',
        level: 'MEDIUM',
        timestamp: new Date()
      }
    };
  }

  async executeBatch<T = Record<string, unknown>>(
    queries: ReadonlyArray<{ query: string; params?: ReadonlyArray<QueryParameter> }>,
    options?: import('../../types/adapters').BatchOptions
  ): Promise<BatchOperationResult<QueryResult<T>>> {
    const results: DatabaseOperationResult<QueryResult<T>>[] = [];
    const errors: DatabaseError[] = [];
    let successfulOperations = 0;

    for (const queryInfo of queries) {
      try {
        const result = await this.execute<T>(queryInfo.query, queryInfo.params);
        results.push(result);
        if (result.success) {
          successfulOperations++;
        } else if (result.error) {
          errors.push(result.error);
        }
      } catch (error) {
        const dbError: DatabaseError = {
          code: 'BATCH_QUERY_FAILED',
          message: `Batch query failed: ${error instanceof Error ? error.message : String(error)}`,
          category: 'QUERY',
          level: 'MEDIUM',
          timestamp: new Date(),
          query: queryInfo.query,
          parameters: queryInfo.params,
          cause: error instanceof Error ? error : undefined
        };
        errors.push(dbError);
        results.push({
          success: false,
          error: dbError
        });
      }

      if (!options?.continueOnError && errors.length > 0) {
        break;
      }
    }

    return {
      totalOperations: queries.length,
      successfulOperations,
      failedOperations: queries.length - successfulOperations,
      results,
      errors
    };
  }

  async healthCheck(): Promise<DatabaseOperationResult<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  }>> {
    try {
      const connectionTest = await this.testConnection();
      const status = connectionTest.success && connectionTest.data ? 'healthy' : 'unhealthy';
      
      return {
        success: true,
        data: {
          status,
          details: {
            connected: this.isConnected,
            lastActivity: this.lastActivity,
            connectionTest: connectionTest.success
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
          category: 'QUERY',
          level: 'MEDIUM',
          timestamp: new Date(),
          cause: error instanceof Error ? error : undefined
        }
      };
    }
  }

  protected updateLastActivity(): void {
    this.lastActivity = new Date();
  }

  protected createDatabaseError(
    code: string,
    message: string,
    category: DatabaseError['category'] = 'QUERY',
    level: DatabaseError['level'] = 'MEDIUM',
    context?: Record<string, unknown>
  ): DatabaseError {
    return {
      code,
      message,
      category,
      level,
      timestamp: new Date(),
      context,
      databaseType: this.config.type
    };
  }
}