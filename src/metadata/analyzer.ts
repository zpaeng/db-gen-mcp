import { ConnectionPoolManager } from '../database/pool';
import { DatabaseConfig } from '../types';

export class MetadataAnalyzer {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async getTables(): Promise<string[]> {
    const adapter = await ConnectionPoolManager.getConnection(this.config);
    const result = await adapter.getTables();
    
    if (result.success && result.data) {
      return Array.from(result.data);
    } else {
      throw new Error(result.error?.message || 'Failed to get tables');
    }
  }

  async getTableSchema(tableName: string): Promise<any> {
    const adapter = await ConnectionPoolManager.getConnection(this.config);
    return adapter.getTableSchema(tableName);
  }
}