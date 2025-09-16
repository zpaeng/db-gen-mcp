import { DatabaseConfig } from '../types';
import { IDatabaseAdapter } from '../types/adapters';
import { DatabaseManager } from './manager';
import { ErrorHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';

interface PooledConnection {
  adapter: IDatabaseAdapter;
  lastUsed: Date;
  inUse: boolean;
  connectionCount: number;
}

export class ConnectionPoolManager {
  private static pools: Map<string, PooledConnection[]> = new Map();
  private static readonly MAX_POOL_SIZE = 10;
  private static readonly MAX_IDLE_TIME = 30 * 60 * 1000; // 30分钟
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟
  private static cleanupTimer?: NodeJS.Timeout;

  static {
    // 启动清理定时器
    this.startCleanupTimer();
  }

  private static getConfigKey(config: DatabaseConfig): string {
    return `${config.type}://${config.username}@${config.host}:${config.port}/${config.database}`;
  }

  static async getConnection(config: DatabaseConfig): Promise<IDatabaseAdapter> {
    const key = this.getConfigKey(config);
    let pool = this.pools.get(key);

    if (!pool) {
      pool = [];
      this.pools.set(key, pool);
    }

    // 查找可用连接
    let availableConnection = pool.find(conn => !conn.inUse);

    if (availableConnection) {
      // 检查连接是否仍然有效
      const healthCheck = await availableConnection.adapter.healthCheck();
      if (healthCheck.success && healthCheck.data?.status === 'healthy') {
        availableConnection.inUse = true;
        availableConnection.lastUsed = new Date();
        availableConnection.connectionCount++;
        return availableConnection.adapter;
      } else {
        // 移除无效连接
        const index = pool.indexOf(availableConnection);
        pool.splice(index, 1);
        await availableConnection.adapter.disconnect();
      }
    }

    // 如果池未满，创建新连接
    if (pool.length < this.MAX_POOL_SIZE) {
      try {
        const adapter = DatabaseManager.getAdapter(config);
        const connectResult = await adapter.connect();
        
        if (!connectResult.success) {
          throw new Error(`Failed to create connection: ${connectResult.error?.message}`);
        }

        const pooledConnection: PooledConnection = {
          adapter,
          lastUsed: new Date(),
          inUse: true,
          connectionCount: 1
        };

        pool.push(pooledConnection);
        logger.debug(`Created new connection for ${key}. Pool size: ${pool.length}`);
        
        return adapter;
      } catch (error) {
        const appError = ErrorHandler.createConnectionError(
          'POOL_CONNECTION_FAILED',
          `Failed to create pooled connection: ${error instanceof Error ? error.message : String(error)}`,
          config.host,
          config.port,
          config.database
        );
        ErrorHandler.handle(appError);
        throw appError;
      }
    }

    // 池已满，等待可用连接
    return this.waitForAvailableConnection(key, config);
  }

  static async releaseConnection(config: DatabaseConfig, adapter: IDatabaseAdapter): Promise<void> {
    const key = this.getConfigKey(config);
    const pool = this.pools.get(key);

    if (pool) {
      const connection = pool.find(conn => conn.adapter === adapter);
      if (connection) {
        connection.inUse = false;
        connection.lastUsed = new Date();
        logger.debug(`Released connection for ${key}`);
      }
    }
  }

  static async cleanup(): Promise<void> {
    logger.info('Starting connection pool cleanup...');
    
    for (const [key, pool] of this.pools.entries()) {
      const connectionsToRemove: PooledConnection[] = [];
      
      for (const connection of pool) {
        if (!connection.inUse) {
          try {
            await connection.adapter.disconnect();
            connectionsToRemove.push(connection);
          } catch (error) {
            logger.warn(`Error disconnecting adapter for ${key}:`, error);
          }
        }
      }
      
      // 移除已断开的连接
      connectionsToRemove.forEach(conn => {
        const index = pool.indexOf(conn);
        if (index > -1) {
          pool.splice(index, 1);
        }
      });
      
      if (pool.length === 0) {
        this.pools.delete(key);
      }
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    logger.info('Connection pool cleanup completed');
  }

  static getPoolStatistics(): {
    totalPools: number;
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    poolDetails: Array<{
      key: string;
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
    }>;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    let idleConnections = 0;
    const poolDetails: Array<{
      key: string;
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
    }> = [];

    for (const [key, pool] of this.pools.entries()) {
      const active = pool.filter(conn => conn.inUse).length;
      const idle = pool.filter(conn => !conn.inUse).length;
      
      totalConnections += pool.length;
      activeConnections += active;
      idleConnections += idle;
      
      poolDetails.push({
        key,
        totalConnections: pool.length,
        activeConnections: active,
        idleConnections: idle
      });
    }

    return {
      totalPools: this.pools.size,
      totalConnections,
      activeConnections,
      idleConnections,
      poolDetails
    };
  }

  private static async waitForAvailableConnection(
    key: string,
    config: DatabaseConfig,
    timeout: number = 30000
  ): Promise<IDatabaseAdapter> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const pool = this.pools.get(key);
      if (pool) {
        const availableConnection = pool.find(conn => !conn.inUse);
        if (availableConnection) {
          availableConnection.inUse = true;
          availableConnection.lastUsed = new Date();
          availableConnection.connectionCount++;
          return availableConnection.adapter;
        }
      }
      
      // 等待100ms后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw ErrorHandler.createConnectionError(
      'POOL_TIMEOUT',
      `Timeout waiting for available connection after ${timeout}ms`,
      config.host,
      config.port,
      config.database
    );
  }

  private static startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupIdleConnections();
      } catch (error) {
        logger.error('Error during scheduled cleanup:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  private static async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    
    for (const [key, pool] of this.pools.entries()) {
      const connectionsToRemove: PooledConnection[] = [];
      
      for (const connection of pool) {
        if (!connection.inUse) {
          const idleTime = now.getTime() - connection.lastUsed.getTime();
          if (idleTime > this.MAX_IDLE_TIME) {
            try {
              await connection.adapter.disconnect();
              connectionsToRemove.push(connection);
              logger.debug(`Removed idle connection for ${key} (idle for ${idleTime}ms)`);
            } catch (error) {
              logger.warn(`Error disconnecting idle connection for ${key}:`, error);
            }
          }
        }
      }
      
      // 移除已断开的连接
      connectionsToRemove.forEach(conn => {
        const index = pool.indexOf(conn);
        if (index > -1) {
          pool.splice(index, 1);
        }
      });
      
      if (pool.length === 0) {
        this.pools.delete(key);
      }
    }
  }

  // 优雅关闭
  static async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown of connection pools...');
    
    // 停止清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    // 等待所有活动连接完成
    const maxWaitTime = 30000; // 30秒
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const stats = this.getPoolStatistics();
      if (stats.activeConnections === 0) {
        break;
      }
      
      logger.info(`Waiting for ${stats.activeConnections} active connections to finish...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 强制清理所有连接
    await this.cleanup();
    
    logger.info('Connection pool graceful shutdown completed');
  }
}

// 进程退出时清理连接池
process.on('SIGINT', async () => {
  await ConnectionPoolManager.gracefulShutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await ConnectionPoolManager.gracefulShutdown();
  process.exit(0);
});