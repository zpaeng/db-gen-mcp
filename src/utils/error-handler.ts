/**
 * 统一错误处理机制
 */

import { 
  AppError, 
  DatabaseError, 
  ConnectionError, 
  QueryError, 
  ValidationError,
  ErrorLevel,
  ErrorCategory,
  ErrorHandlingResult,
  ErrorRecoveryStrategy,
  ErrorStatistics
} from '../types/errors';
import { logger } from './logger';

export class ErrorHandler {
  private static errorStats: Map<string, number> = new Map();
  private static errorHistory: AppError[] = [];
  private static readonly MAX_HISTORY_SIZE = 1000;

  /**
   * 处理应用程序错误
   */
  static handle(error: AppError | Error): ErrorHandlingResult {
    let appError: AppError;

    // 转换普通错误为应用错误
    if (!(error as AppError).code) {
      appError = this.convertToAppError(error as Error);
    } else {
      appError = error as AppError;
    }

    // 记录错误统计
    this.recordError(appError);

    // 记录错误日志
    this.logError(appError);

    // 确定处理策略
    const result = this.determineHandlingStrategy(appError);

    return result;
  }

  /**
   * 创建数据库错误
   */
  static createDatabaseError(
    code: string,
    message: string,
    category: DatabaseError['category'] = 'QUERY',
    level: ErrorLevel = 'MEDIUM',
    context?: Record<string, unknown>
  ): DatabaseError {
    return {
      code,
      message,
      category,
      level,
      timestamp: new Date(),
      context,
      stack: new Error().stack
    };
  }

  /**
   * 创建连接错误
   */
  static createConnectionError(
    code: string,
    message: string,
    host?: string,
    port?: number,
    database?: string
  ): ConnectionError {
    return {
      code,
      message,
      category: 'CONNECTION',
      level: 'HIGH',
      timestamp: new Date(),
      host,
      port,
      database,
      stack: new Error().stack
    };
  }

  /**
   * 创建查询错误
   */
  static createQueryError(
    code: string,
    message: string,
    query: string,
    parameters?: ReadonlyArray<unknown>,
    executionTime?: number
  ): QueryError {
    return {
      code,
      message,
      category: 'QUERY',
      level: 'HIGH',
      timestamp: new Date(),
      query,
      parameters,
      executionTime,
      stack: new Error().stack
    };
  }

  /**
   * 创建验证错误
   */
  static createValidationError(
    code: string,
    message: string,
    field?: string,
    value?: unknown,
    constraint?: string
  ): ValidationError {
    return {
      code,
      message,
      category: 'VALIDATION',
      level: 'MEDIUM',
      timestamp: new Date(),
      field,
      value,
      constraint,
      stack: new Error().stack
    };
  }

  /**
   * 包装异步操作，自动处理错误
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    errorContext?: Record<string, unknown>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const appError = this.convertToAppError(error as Error, errorContext);
      const result = this.handle(appError);
      
      if (result.retry) {
        // 实现重试逻辑
        await this.delay(result.retryAfterMs || 1000);
        return this.wrap(operation, errorContext);
      }
      
      throw appError;
    }
  }

  /**
   * 获取错误统计信息
   */
  static getStatistics(): ErrorStatistics {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentErrors = this.errorHistory.filter(
      error => error.timestamp >= oneHourAgo
    );

    const errorsByCategory: Record<ErrorCategory, number> = {
      CONNECTION: 0,
      QUERY: 0,
      VALIDATION: 0,
      AUTHENTICATION: 0,
      AUTHORIZATION: 0,
      TIMEOUT: 0,
      RESOURCE: 0,
      CONFIGURATION: 0,
      NETWORK: 0,
      SYSTEM: 0
    };

    const errorsByLevel: Record<ErrorLevel, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };

    const errorsByCode: Record<string, number> = {};

    recentErrors.forEach(error => {
      errorsByCategory[error.category]++;
      errorsByLevel[error.level]++;
      errorsByCode[error.code] = (errorsByCode[error.code] || 0) + 1;
    });

    return {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsByLevel,
      errorsByCode,
      averageResolutionTime: 0, // 需要实现解决时间跟踪
      lastError: this.errorHistory[this.errorHistory.length - 1],
      timeRange: {
        start: oneHourAgo,
        end: now
      }
    };
  }

  /**
   * 清理错误历史
   */
  static clearHistory(): void {
    this.errorHistory = [];
    this.errorStats.clear();
  }

  /**
   * 设置错误恢复策略
   */
  static setRecoveryStrategy(errorCode: string, strategy: ErrorRecoveryStrategy): void {
    // 实现错误恢复策略存储
    // 这里可以扩展为持久化存储
  }

  private static convertToAppError(error: Error, context?: Record<string, unknown>): AppError {
    // 根据错误类型和消息确定错误类别
    if (error.message.includes('connection') || error.message.includes('connect')) {
      return this.createConnectionError(
        error.name || 'CONNECTION_ERROR',
        error.message
      );
    } else if (error.message.includes('query') || error.message.includes('SQL')) {
      return this.createQueryError(
        error.name || 'QUERY_ERROR',
        error.message,
        'Unknown query'
      );
    } else if (error.message.includes('timeout')) {
      return {
        code: error.name || 'TIMEOUT_ERROR',
        message: error.message,
        category: 'TIMEOUT',
        level: 'MEDIUM',
        timestamp: new Date(),
        timeoutMs: 30000,
        context,
        cause: error,
        stack: error.stack
      };
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      return this.createValidationError(
        error.name || 'VALIDATION_ERROR',
        error.message
      );
    }

    // 默认为系统错误
    return {
      code: error.name || 'SYSTEM_ERROR',
      message: error.message,
      category: 'SYSTEM',
      level: 'MEDIUM',
      timestamp: new Date(),
      context,
      cause: error,
      stack: error.stack
    };
  }

  private static recordError(error: AppError): void {
    // 更新统计
    const key = `${error.category}_${error.code}`;
    this.errorStats.set(key, (this.errorStats.get(key) || 0) + 1);

    // 添加到历史记录
    this.errorHistory.push(error);

    // 限制历史记录大小
    if (this.errorHistory.length > this.MAX_HISTORY_SIZE) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  private static logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.level);
    const logMessage = `[${error.category}] ${error.code}: ${error.message}`;
    
    switch (logLevel) {
      case 'DEBUG':
        logger.debug(logMessage, error);
        break;
      case 'INFO':
        logger.info(logMessage, error);
        break;
      case 'WARN':
        logger.warn(logMessage, error);
        break;
      case 'ERROR':
        logger.error(logMessage, error);
        break;
      case 'FATAL':
        logger.error(`FATAL: ${logMessage}`, error);
        break;
    }
  }

  private static determineHandlingStrategy(error: AppError): ErrorHandlingResult {
    // 根据错误类型和级别确定处理策略
    switch (error.category) {
      case 'CONNECTION':
        return {
          handled: true,
          retry: true,
          retryAfterMs: 5000,
          escalate: error.level === 'CRITICAL',
          logLevel: this.getLogLevel(error.level)
        };
        
      case 'TIMEOUT':
        return {
          handled: true,
          retry: true,
          retryAfterMs: 2000,
          escalate: false,
          logLevel: this.getLogLevel(error.level)
        };
        
      case 'QUERY':
        return {
          handled: true,
          retry: false, // 查询错误通常不应重试
          escalate: error.level === 'CRITICAL',
          logLevel: this.getLogLevel(error.level)
        };
        
      case 'VALIDATION':
        return {
          handled: true,
          retry: false,
          escalate: false,
          logLevel: this.getLogLevel(error.level)
        };
        
      default:
        return {
          handled: true,
          retry: false,
          escalate: error.level === 'CRITICAL',
          logLevel: this.getLogLevel(error.level)
        };
    }
  }

  private static getLogLevel(errorLevel: ErrorLevel): 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' {
    switch (errorLevel) {
      case 'LOW':
        return 'DEBUG';
      case 'MEDIUM':
        return 'WARN';
      case 'HIGH':
        return 'ERROR';
      case 'CRITICAL':
        return 'FATAL';
      default:
        return 'ERROR';
    }
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 错误处理装饰器
 */
export function HandleErrors(
  errorContext?: Record<string, unknown>
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const appError = ErrorHandler.handle(error as AppError);
        throw error;
      }
    };
  };
}

/**
 * 全局错误处理器
 */
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorHandlers: Map<string, (error: AppError) => void> = new Map();

  static getInstance(): GlobalErrorHandler {
    if (!this.instance) {
      this.instance = new GlobalErrorHandler();
    }
    return this.instance;
  }

  /**
   * 注册错误处理器
   */
  registerHandler(errorCode: string, handler: (error: AppError) => void): void {
    this.errorHandlers.set(errorCode, handler);
  }

  /**
   * 处理未捕获的错误
   */
  handleUncaughtError(error: Error): void {
    // 创建一个简单的系统错误
    const appError: AppError = {
      code: error.name || 'UNCAUGHT_ERROR',
      message: error.message,
      category: 'SYSTEM',
      level: 'CRITICAL',
      timestamp: new Date(),
      cause: error,
      stack: error.stack
    };
    const result = ErrorHandler.handle(appError);
    
    // 查找特定的错误处理器
    const handler = this.errorHandlers.get(appError.code);
    if (handler) {
      handler(appError);
    }

    // 记录致命错误
    logger.error('Uncaught error:', error);
  }

  /**
   * 初始化全局错误处理
   */
  initialize(): void {
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      this.handleUncaughtError(error);
      process.exit(1);
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleUncaughtError(error);
    });
  }
}