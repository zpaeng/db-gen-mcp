export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private context: string = 'DB-GEN-MCP';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setContext(context: string): void {
    this.context = context;
  }

  debug(message: string, data?: any, context?: string): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: string): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: string): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  error(message: string, error?: Error | any, context?: string): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, undefined, context, error);
    } else {
      this.log(LogLevel.ERROR, message, error, context);
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string, error?: Error): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: context || this.context,
      data,
      error
    };

    this.output(entry);
  }

  private output(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const contextStr = entry.context ? `[${entry.context}]` : '';
    
    let logMessage = `${timestamp} ${levelName} ${contextStr} ${entry.message}`;

    if (entry.data) {
      logMessage += `\nData: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      logMessage += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        logMessage += `\nStack: ${entry.error.stack}`;
      }
    }

    // 输出到 stderr 以避免干扰 MCP 通信
    switch (entry.level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.error(logMessage);
        break;
      case LogLevel.WARN:
        console.error(`⚠️  ${logMessage}`);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${logMessage}`);
        break;
    }
  }

  // 便捷方法：记录数据库操作
  logDatabaseOperation(operation: string, table: string, duration?: number, data?: any): void {
    const message = `Database ${operation} on table '${table}'${duration ? ` (${duration}ms)` : ''}`;
    this.info(message, data, 'DATABASE');
  }

  // 便捷方法：记录代码生成
  logCodeGeneration(type: string, tableName: string, outputPath: string): void {
    const message = `Generated ${type} for table '${tableName}' at '${outputPath}'`;
    this.info(message, undefined, 'CODEGEN');
  }

  // 便捷方法：记录MCP工具调用
  logToolCall(toolName: string, args?: any, duration?: number): void {
    const message = `MCP tool '${toolName}' called${duration ? ` (${duration}ms)` : ''}`;
    this.info(message, args, 'MCP');
  }

  // 便捷方法：记录连接事件
  logConnection(event: 'connect' | 'disconnect' | 'error', dbType: string, host?: string): void {
    const message = `Database ${event}: ${dbType}${host ? ` at ${host}` : ''}`;
    if (event === 'error') {
      this.error(message, undefined, 'CONNECTION');
    } else {
      this.info(message, undefined, 'CONNECTION');
    }
  }

  // 便捷方法：记录性能指标
  logPerformance(operation: string, duration: number, details?: any): void {
    const message = `Performance: ${operation} took ${duration}ms`;
    if (duration > 5000) {
      this.warn(message, details, 'PERFORMANCE');
    } else if (duration > 1000) {
      this.info(message, details, 'PERFORMANCE');
    } else {
      this.debug(message, details, 'PERFORMANCE');
    }
  }

  // 创建子logger，带有特定上下文
  createChildLogger(context: string): Logger {
    const childLogger = new Logger();
    childLogger.logLevel = this.logLevel;
    childLogger.context = `${this.context}:${context}`;
    return childLogger;
  }
}

// 导出默认实例
export const logger = Logger.getInstance();

// 性能测量装饰器
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        logger.logPerformance(`${operation}:${propertyName}`, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`${operation}:${propertyName} failed after ${duration}ms`, error);
        throw error;
      }
    };
  };
}

// 日志记录装饰器
export function logMethod(context?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const ctx = context || target.constructor.name;
      logger.debug(`Calling ${ctx}.${propertyName}`, args);
      
      try {
        const result = await method.apply(this, args);
        logger.debug(`${ctx}.${propertyName} completed successfully`);
        return result;
      } catch (error) {
        logger.error(`${ctx}.${propertyName} failed`, error);
        throw error;
      }
    };
  };
}