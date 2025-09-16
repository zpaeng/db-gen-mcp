import { DatabaseConfig } from '../types';

/**
 * 字符串工具函数
 */
export class StringUtils {
  /**
   * 转换为驼峰命名法
   */
  static toCamelCase(str: string): string {
    return str.replace(/_(\w)/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 转换为帕斯卡命名法
   */
  static toPascalCase(str: string): string {
    return str.replace(/(^\w|-\w|_\w)/g, (match) => 
      match.replace(/[-_]/, '').toUpperCase()
    );
  }

  /**
   * 转换为下划线命名法
   */
  static toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  /**
   * 转换为短横线命名法
   */
  static toKebabCase(str: string): string {
    return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  /**
   * 首字母大写
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 首字母小写
   */
  static uncapitalize(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * 移除表前缀
   */
  static removeTablePrefix(tableName: string, prefix?: string): string {
    if (!prefix) return tableName;
    return tableName.startsWith(prefix) ? tableName.slice(prefix.length) : tableName;
  }

  /**
   * 添加后缀
   */
  static addSuffix(str: string, suffix: string): string {
    return str.endsWith(suffix) ? str : str + suffix;
  }

  /**
   * 移除后缀
   */
  static removeSuffix(str: string, suffix: string): string {
    return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
  }

  /**
   * 清理和格式化字符串
   */
  static clean(str: string): string {
    return str.trim().replace(/\s+/g, ' ');
  }

  /**
   * 截断字符串
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
  }
}

/**
 * 数据库类型映射工具
 */
export class TypeMapper {
  private static readonly TYPE_MAPPINGS: Record<string, Record<string, string>> = {
    mysql: {
      'varchar': 'String',
      'char': 'String',
      'text': 'String',
      'longtext': 'String',
      'mediumtext': 'String',
      'tinytext': 'String',
      'int': 'Integer',
      'integer': 'Integer',
      'tinyint': 'Integer',
      'smallint': 'Integer',
      'mediumint': 'Integer',
      'bigint': 'Long',
      'decimal': 'BigDecimal',
      'numeric': 'BigDecimal',
      'float': 'Float',
      'double': 'Double',
      'datetime': 'LocalDateTime',
      'timestamp': 'LocalDateTime',
      'date': 'LocalDate',
      'time': 'LocalTime',
      'year': 'Integer',
      'boolean': 'Boolean',
      'tinyint(1)': 'Boolean',
      'json': 'String',
      'blob': 'byte[]',
      'longblob': 'byte[]',
      'mediumblob': 'byte[]',
      'tinyblob': 'byte[]'
    },
    postgresql: {
      'varchar': 'String',
      'character varying': 'String',
      'char': 'String',
      'character': 'String',
      'text': 'String',
      'integer': 'Integer',
      'int': 'Integer',
      'int4': 'Integer',
      'smallint': 'Integer',
      'int2': 'Integer',
      'bigint': 'Long',
      'int8': 'Long',
      'decimal': 'BigDecimal',
      'numeric': 'BigDecimal',
      'real': 'Float',
      'float4': 'Float',
      'double precision': 'Double',
      'float8': 'Double',
      'timestamp': 'LocalDateTime',
      'timestamptz': 'LocalDateTime',
      'date': 'LocalDate',
      'time': 'LocalTime',
      'timetz': 'LocalTime',
      'boolean': 'Boolean',
      'bool': 'Boolean',
      'json': 'String',
      'jsonb': 'String',
      'uuid': 'String',
      'bytea': 'byte[]'
    }
  };

  /**
   * 将数据库类型映射为Java类型
   */
  static mapDbTypeToJavaType(dbType: string, databaseType: string = 'mysql'): string {
    const normalizedType = dbType.toLowerCase().replace(/\(\d+\)/, '').trim();
    const mappings = this.TYPE_MAPPINGS[databaseType.toLowerCase()] || this.TYPE_MAPPINGS.mysql;
    
    // 特殊处理 tinyint(1) 作为 Boolean
    if (dbType.toLowerCase().includes('tinyint(1)')) {
      return 'Boolean';
    }
    
    return mappings[normalizedType] || 'Object';
  }

  /**
   * 获取Java类型的导入语句
   */
  static getJavaTypeImports(javaType: string): string[] {
    const imports: string[] = [];
    
    switch (javaType) {
      case 'LocalDateTime':
        imports.push('java.time.LocalDateTime');
        break;
      case 'LocalDate':
        imports.push('java.time.LocalDate');
        break;
      case 'LocalTime':
        imports.push('java.time.LocalTime');
        break;
      case 'BigDecimal':
        imports.push('java.math.BigDecimal');
        break;
    }
    
    return imports;
  }
}

/**
 * 文件路径工具
 */
export class PathUtils {
  /**
   * 标准化路径分隔符
   */
  static normalize(path: string): string {
    return path.replace(/\\/g, '/');
  }

  /**
   * 连接路径
   */
  static join(...paths: string[]): string {
    return paths
      .map(path => path.replace(/^\/+|\/+$/g, ''))
      .filter(path => path.length > 0)
      .join('/');
  }

  /**
   * 获取文件扩展名
   */
  static getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot + 1);
  }

  /**
   * 获取文件名（不含扩展名）
   */
  static getBasename(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    const lastSlash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
    const start = lastSlash + 1;
    const end = lastDot === -1 ? filename.length : lastDot;
    return filename.slice(start, end);
  }

  /**
   * 确保路径以指定字符结尾
   */
  static ensureTrailingSlash(path: string): string {
    return path.endsWith('/') ? path : path + '/';
  }

  /**
   * 移除路径末尾的斜杠
   */
  static removeTrailingSlash(path: string): string {
    return path.replace(/\/+$/, '');
  }
}

/**
 * 验证工具
 */
export class ValidationUtils {
  /**
   * 验证数据库配置
   */
  static validateDatabaseConfig(config: DatabaseConfig): string[] {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('数据库类型不能为空');
    }

    if (!config.database) {
      errors.push('数据库名称不能为空');
    }

    if (config.type !== 'sqlite') {
      if (!config.host) {
        errors.push('数据库主机不能为空');
      }
      if (!config.username) {
        errors.push('数据库用户名不能为空');
      }
    }

    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('端口号必须在1-65535之间');
    }

    return errors;
  }

  /**
   * 验证包名格式
   */
  static validatePackageName(packageName: string): boolean {
    const packageRegex = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;
    return packageRegex.test(packageName);
  }

  /**
   * 验证Java标识符
   */
  static validateJavaIdentifier(identifier: string): boolean {
    const javaIdentifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return javaIdentifierRegex.test(identifier);
  }

  /**
   * 验证表名
   */
  static validateTableName(tableName: string): boolean {
    const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return tableNameRegex.test(tableName);
  }
}

/**
 * 时间工具
 */
export class TimeUtils {
  /**
   * 格式化持续时间
   */
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    const seconds = Math.floor(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * 获取当前时间戳
   */
  static now(): number {
    return Date.now();
  }

  /**
   * 格式化日期为ISO字符串
   */
  static formatISO(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * 格式化日期为本地字符串
   */
  static formatLocal(date: Date = new Date()): string {
    return date.toLocaleString();
  }
}

/**
 * 对象工具
 */
export class ObjectUtils {
  /**
   * 深度克隆对象
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime()) as unknown as T;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as unknown as T;
    }
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    
    return cloned;
  }

  /**
   * 合并对象
   */
  static merge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
    const result = { ...target };
    
    for (const source of sources) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          result[key] = source[key] as T[Extract<keyof T, string>];
        }
      }
    }
    
    return result;
  }

  /**
   * 移除对象中的空值
   */
  static removeEmpty<T extends Record<string, any>>(obj: T): Partial<T> {
    const result: Partial<T> = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (value !== null && value !== undefined && value !== '') {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  /**
   * 检查对象是否为空
   */
  static isEmpty(obj: any): boolean {
    if (obj === null || obj === undefined) return true;
    if (typeof obj === 'string') return obj.length === 0;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }
}

/**
 * 错误处理工具
 */
export class ErrorUtils {
  /**
   * 创建标准化错误
   */
  static createError(message: string, code?: string, details?: any): Error {
    const error = new Error(message);
    (error as any).code = code;
    (error as any).details = details;
    return error;
  }

  /**
   * 格式化错误信息
   */
  static formatError(error: Error): string {
    let message = error.message;
    
    if ((error as any).code) {
      message = `[${(error as any).code}] ${message}`;
    }
    
    return message;
  }

  /**
   * 检查是否为特定类型的错误
   */
  static isErrorType(error: any, type: string): boolean {
    return error && error.code === type;
  }

  /**
   * 安全地执行异步函数
   */
  static async safeAsync<T>(
    fn: () => Promise<T>,
    defaultValue?: T
  ): Promise<{ success: boolean; data?: T; error?: Error }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error(String(error)),
        data: defaultValue
      };
    }
  }
}