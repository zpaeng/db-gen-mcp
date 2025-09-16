import { DatabaseConfig, DatabaseType } from '../types';
import { IDatabaseAdapter } from '../types/adapters';
import { MySqlAdapter } from './adapters/mysql';
import { PostgreSQLAdapter } from './adapters/postgresql';
import { MSSQLAdapter } from './adapters/mssql';
import { OracleAdapter } from './adapters/oracle';
import { SQLiteAdapter } from './adapters/sqlite';

export class DatabaseManager {
  private static adapters: Map<DatabaseType, new (config: DatabaseConfig) => IDatabaseAdapter> = new Map();

  static {
    this.registerAdapter('mysql', MySqlAdapter);
    this.registerAdapter('postgresql', PostgreSQLAdapter);
    this.registerAdapter('mssql', MSSQLAdapter);
    this.registerAdapter('oracle', OracleAdapter);
    this.registerAdapter('sqlite', SQLiteAdapter);
  }

  static registerAdapter(type: DatabaseType, adapterClass: new (config: DatabaseConfig) => IDatabaseAdapter) {
    this.adapters.set(type, adapterClass);
  }

  static getAdapter(config: DatabaseConfig): IDatabaseAdapter {
    const AdapterClass = this.adapters.get(config.type);
    if (!AdapterClass) {
      throw new Error(`Database type '${config.type}' is not supported.`);
    }
    return new AdapterClass(config);
  }
}