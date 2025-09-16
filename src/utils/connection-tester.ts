import { DatabaseConfig } from '../types';
import { ConnectionPoolManager } from '../database/pool';
import { DatabaseOperationResult } from '../types/database';

export class ConnectionTester {
  /**
   * 测试数据库连接
   * @param config 数据库配置
   * @returns 连接测试结果
   */
  static async testConnection(config: DatabaseConfig): Promise<DatabaseOperationResult<boolean>> {
    try {
      const adapter = await ConnectionPoolManager.getConnection(config);
      const result = await adapter.testConnection();
      
      if (result.success && result.data) {
        return {
          success: true,
          data: true
        };
      } else {
        return {
          success: true,
          data: false
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_TEST_FAILED',
          message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
          category: 'CONNECTION',
          level: 'HIGH',
          timestamp: new Date(),
          context: { config: { type: config.type, host: config.host, database: config.database } },
          cause: error instanceof Error ? error : undefined
        }
      };
    }
  }

  /**
   * 测试多个数据库连接
   * @param configs 数据库配置数组
   * @returns 连接测试结果数组
   */
  static async testMultipleConnections(configs: DatabaseConfig[]): Promise<DatabaseOperationResult<Record<string, boolean>>> {
    try {
      const results: Record<string, boolean> = {};
      
      for (const config of configs) {
        const testResult = await this.testConnection(config);
        const key = `${config.type}_${config.host}_${config.database}`;
        results[key] = testResult.success && testResult.data === true;
      }
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MULTIPLE_CONNECTION_TEST_FAILED',
          message: `Multiple connection test failed: ${error instanceof Error ? error.message : String(error)}`,
          category: 'CONNECTION',
          level: 'HIGH',
          timestamp: new Date(),
          cause: error instanceof Error ? error : undefined
        }
      };
    }
  }
}