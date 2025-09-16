/**
 * 统一的错误类型体系
 */

// 错误级别
export type ErrorLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// 错误类别
export type ErrorCategory = 
  | 'CONNECTION'
  | 'QUERY'
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'TIMEOUT'
  | 'RESOURCE'
  | 'CONFIGURATION'
  | 'NETWORK'
  | 'SYSTEM';

// 基础错误接口
export interface BaseError {
  readonly code: string;
  readonly message: string;
  readonly category: ErrorCategory;
  readonly level: ErrorLevel;
  readonly timestamp: Date;
  readonly context?: Record<string, unknown>;
  readonly cause?: Error;
  readonly stack?: string;
}

// 数据库错误
export interface DatabaseError extends BaseError {
  readonly category: 'CONNECTION' | 'QUERY' | 'TIMEOUT' | 'RESOURCE';
  readonly sqlState?: string;
  readonly query?: string;
  readonly parameters?: ReadonlyArray<unknown>;
  readonly connectionId?: string;
  readonly databaseType?: string;
}

// 连接错误
export interface ConnectionError extends DatabaseError {
  readonly category: 'CONNECTION';
  readonly host?: string;
  readonly port?: number;
  readonly database?: string;
  readonly retryAttempt?: number;
  readonly maxRetries?: number;
}

// 查询错误
export interface QueryError extends DatabaseError {
  readonly category: 'QUERY';
  readonly query: string;
  readonly parameters?: ReadonlyArray<unknown>;
  readonly executionTime?: number;
  readonly affectedRows?: number;
}

// 验证错误
export interface ValidationError extends BaseError {
  readonly category: 'VALIDATION';
  readonly field?: string;
  readonly value?: unknown;
  readonly constraint?: string;
  readonly validationRule?: string;
}

// 认证错误
export interface AuthenticationError extends BaseError {
  readonly category: 'AUTHENTICATION';
  readonly username?: string;
  readonly authMethod?: string;
  readonly attemptCount?: number;
}

// 授权错误
export interface AuthorizationError extends BaseError {
  readonly category: 'AUTHORIZATION';
  readonly resource?: string;
  readonly action?: string;
  readonly requiredPermissions?: ReadonlyArray<string>;
  readonly userPermissions?: ReadonlyArray<string>;
}

// 超时错误
export interface TimeoutError extends BaseError {
  readonly category: 'TIMEOUT';
  readonly timeoutMs: number;
  readonly operation?: string;
  readonly elapsedMs?: number;
}

// 资源错误
export interface ResourceError extends BaseError {
  readonly category: 'RESOURCE';
  readonly resourceType?: 'MEMORY' | 'DISK' | 'CONNECTION' | 'CPU';
  readonly currentUsage?: number;
  readonly maxLimit?: number;
  readonly unit?: string;
}

// 配置错误
export interface ConfigurationError extends BaseError {
  readonly category: 'CONFIGURATION';
  readonly configKey?: string;
  readonly configValue?: unknown;
  readonly expectedType?: string;
  readonly validValues?: ReadonlyArray<unknown>;
}

// 网络错误
export interface NetworkError extends BaseError {
  readonly category: 'NETWORK';
  readonly host?: string;
  readonly port?: number;
  readonly protocol?: string;
  readonly statusCode?: number;
  readonly responseTime?: number;
}

// 系统错误
export interface SystemError extends BaseError {
  readonly category: 'SYSTEM';
  readonly systemCode?: number;
  readonly systemMessage?: string;
  readonly processId?: number;
  readonly memoryUsage?: number;
}

// 错误联合类型
export type AppError = 
  | DatabaseError
  | ConnectionError
  | QueryError
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | TimeoutError
  | ResourceError
  | ConfigurationError
  | NetworkError
  | SystemError;

// 错误构建器接口
export interface ErrorBuilder<T extends BaseError = BaseError> {
  code(code: string): ErrorBuilder<T>;
  message(message: string): ErrorBuilder<T>;
  level(level: ErrorLevel): ErrorBuilder<T>;
  context(context: Record<string, unknown>): ErrorBuilder<T>;
  cause(cause: Error): ErrorBuilder<T>;
  build(): T;
}

// 错误处理结果
export interface ErrorHandlingResult {
  readonly handled: boolean;
  readonly retry: boolean;
  readonly retryAfterMs?: number;
  readonly fallbackAction?: string;
  readonly escalate: boolean;
  readonly logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
}

// 错误恢复策略
export interface ErrorRecoveryStrategy {
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly backoffMultiplier: number;
  readonly maxRetryDelayMs: number;
  readonly retryableErrors: ReadonlyArray<string>;
  readonly fallbackAction?: () => Promise<unknown>;
}

// 错误统计
export interface ErrorStatistics {
  readonly totalErrors: number;
  readonly errorsByCategory: Record<ErrorCategory, number>;
  readonly errorsByLevel: Record<ErrorLevel, number>;
  readonly errorsByCode: Record<string, number>;
  readonly averageResolutionTime: number;
  readonly lastError?: AppError;
  readonly timeRange: {
    start: Date;
    end: Date;
  };
}