import { DatabaseType } from '../types';
import {
  QueryCondition,
  JoinCondition,
  OrderCondition,
  SelectField,
  QueryBuildResult,
  QueryBuildOptions,
  QueryValidationResult,
  QuerySecurityCheck,
  QueryOperator,
  JoinType,
  SortDirection
} from '../types/query';
import { QueryParameter } from '../types/adapters';
import { DatabaseError } from '../types/errors';

export class QueryBuilder {
  private selectFields: SelectField[] = [{ field: '*' }];
  private fromTable: string = '';
  private fromAlias?: string;
  private whereConditions: QueryCondition[] = [];
  private joinClauses: JoinCondition[] = [];
  private orderClauses: OrderCondition[] = [];
  private limitValue?: number;
  private offsetValue?: number;
  private groupByFields: string[] = [];
  private havingConditions: QueryCondition[] = [];
  private distinctFlag: boolean = false;
  private forUpdateFlag: boolean = false;

  constructor(private readonly dbType: DatabaseType = 'mysql') {}

  select(fields: string | string[] | SelectField[]): this {
    if (typeof fields === 'string') {
      this.selectFields = [{ field: fields }];
    } else if (Array.isArray(fields) && typeof fields[0] === 'string') {
      this.selectFields = (fields as string[]).map(field => ({ field }));
    } else {
      this.selectFields = fields as SelectField[];
    }
    return this;
  }

  where(field: string, operator: QueryOperator, value?: QueryParameter | ReadonlyArray<QueryParameter>): this {
    this.whereConditions.push({ field, operator, value });
    return this;
  }

  whereIn(field: string, values: ReadonlyArray<QueryParameter>): this {
    this.whereConditions.push({ field, operator: 'IN', value: values });
    return this;
  }

  whereNull(field: string): this {
    this.whereConditions.push({ field, operator: 'IS NULL' });
    return this;
  }

  whereNotNull(field: string): this {
    this.whereConditions.push({ field, operator: 'IS NOT NULL' });
    return this;
  }

  join(table: string, on: string, type: JoinType = 'INNER'): this {
    this.joinClauses.push({ type, table, on });
    return this;
  }

  leftJoin(table: string, on: string): this {
    return this.join(table, on, 'LEFT');
  }

  rightJoin(table: string, on: string): this {
    return this.join(table, on, 'RIGHT');
  }

  orderBy(field: string, direction: SortDirection = 'ASC'): this {
    this.orderClauses.push({ field, direction });
    return this;
  }

  groupBy(fields: string | string[]): this {
    if (typeof fields === 'string') {
      this.groupByFields = [fields];
    } else {
      this.groupByFields = fields;
    }
    return this;
  }

  having(field: string, operator: QueryOperator, value?: QueryParameter | ReadonlyArray<QueryParameter>): this {
    this.havingConditions.push({ field, operator, value });
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  offset(count: number): this {
    this.offsetValue = count;
    return this;
  }

  build(options?: QueryBuildOptions): QueryBuildResult {
    const params: QueryParameter[] = [];
    const warnings: string[] = [];
    let query = '';

    // SELECT clause
    const distinctClause = this.distinctFlag ? 'DISTINCT ' : '';
    const selectClause = this.selectFields
      .map(field => field.alias ? `${this.escapeIdentifier(field.field)} AS ${this.escapeIdentifier(field.alias)}` : this.escapeIdentifier(field.field))
      .join(', ');
    query += `SELECT ${distinctClause}${selectClause}`;

    // FROM clause
    if (!this.fromTable) {
      const error: DatabaseError = {
        code: 'MISSING_FROM_TABLE',
        message: 'FROM table is required',
        category: 'QUERY',
        level: 'HIGH',
        timestamp: new Date()
      };
      throw error;
    }
    query += ` FROM ${this.escapeIdentifier(this.fromTable)}`;
    if (this.fromAlias) {
      query += ` AS ${this.escapeIdentifier(this.fromAlias)}`;
    }

    // JOIN clauses
    for (const join of this.joinClauses) {
      query += ` ${join.type} JOIN ${this.escapeIdentifier(join.table)}`;
      if (join.alias) {
        query += ` AS ${this.escapeIdentifier(join.alias)}`;
      }
      query += ` ON ${join.on}`;
    }

    // WHERE clause
    if (this.whereConditions.length > 0) {
      const whereClause = this.buildConditions(this.whereConditions, params);
      query += ` WHERE ${whereClause}`;
    }

    // GROUP BY clause
    if (this.groupByFields.length > 0) {
      query += ` GROUP BY ${this.groupByFields.map(field => this.escapeIdentifier(field)).join(', ')}`;
    }

    // HAVING clause
    if (this.havingConditions.length > 0) {
      const havingClause = this.buildConditions(this.havingConditions, params);
      query += ` HAVING ${havingClause}`;
    }

    // ORDER BY clause
    if (this.orderClauses.length > 0) {
      const orderClause = this.orderClauses
        .map(order => `${this.escapeIdentifier(order.field)} ${order.direction}`)
        .join(', ');
      query += ` ORDER BY ${orderClause}`;
    }

    // LIMIT and OFFSET
    if (this.limitValue !== undefined) {
      if (this.dbType === 'mssql') {
        // SQL Server uses OFFSET...FETCH
        if (this.offsetValue !== undefined) {
          query += ` OFFSET ${this.offsetValue} ROWS FETCH NEXT ${this.limitValue} ROWS ONLY`;
        } else {
          query += ` OFFSET 0 ROWS FETCH NEXT ${this.limitValue} ROWS ONLY`;
        }
      } else {
        // MySQL, PostgreSQL, SQLite use LIMIT...OFFSET
        query += ` LIMIT ${this.limitValue}`;
        if (this.offsetValue !== undefined) {
          query += ` OFFSET ${this.offsetValue}`;
        }
      }
    } else if (this.offsetValue !== undefined) {
      if (this.dbType === 'mssql') {
        query += ` OFFSET ${this.offsetValue} ROWS`;
      } else {
        query += ` OFFSET ${this.offsetValue}`;
      }
    }

    // FOR UPDATE clause
    if (this.forUpdateFlag) {
      if (this.dbType !== 'sqlite') { // SQLite doesn't support FOR UPDATE
        query += ' FOR UPDATE';
      }
    }

    return {
      query,
      params,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private buildConditions(conditions: QueryCondition[], params: QueryParameter[]): string {
    return conditions.map(condition => {
      const field = this.escapeIdentifier(condition.field);
      
      switch (condition.operator) {
        case 'IS NULL':
        case 'IS NOT NULL':
          return `${field} ${condition.operator}`;
        
        case 'IN':
        case 'NOT IN':
          if (!Array.isArray(condition.value)) {
            throw new Error(`${condition.operator} requires an array value`);
          }
          const placeholders = condition.value.map(() => this.getParameterPlaceholder(params.length + 1)).join(', ');
          params.push(...condition.value);
          return `${field} ${condition.operator} (${placeholders})`;
        
        case 'BETWEEN':
        case 'NOT BETWEEN':
          if (!Array.isArray(condition.value) || condition.value.length !== 2) {
            throw new Error(`${condition.operator} requires exactly two values`);
          }
          const placeholder1 = this.getParameterPlaceholder(params.length + 1);
          const placeholder2 = this.getParameterPlaceholder(params.length + 2);
          params.push(condition.value[0], condition.value[1]);
          return `${field} ${condition.operator} ${placeholder1} AND ${placeholder2}`;
        
        default:
          const placeholder = this.getParameterPlaceholder(params.length + 1);
          params.push(condition.value as QueryParameter);
          return `${field} ${condition.operator} ${placeholder}`;
      }
    }).join(' AND ');
  }

  private getParameterPlaceholder(index: number): string {
    switch (this.dbType) {
      case 'postgresql':
        return `$${index}`;
      case 'mssql':
        return `@param${index}`;
      case 'oracle':
        return `:param${index}`;
      default:
        return '?';
    }
  }

  private escapeIdentifier(identifier: string): string {
    // Handle wildcard separately
    if (identifier === '*') {
      return '*';
    }

    // Handle SQL functions and expressions (like COUNT(*) as total)
    if (identifier.includes('(') || identifier.toLowerCase().includes(' as ')) {
      return identifier; // Return as-is for SQL functions and expressions
    }

    // 移除潜在的SQL注入字符并转义标识符
    const cleaned = identifier.replace(/[^\w\$.]/g, ''); // Allow dots for table.column syntax

    // 检查清理后的标识符是否为空
    if (!cleaned || cleaned.trim() === '') {
      throw new Error(`Invalid identifier: '${identifier}' - identifier cannot be empty after sanitization`);
    }

    // Handle cases like "table.column"
    if (cleaned.includes('.')) {
      return cleaned.split('.').map(part => this.escapeIdentifier(part)).join('.');
    }

    switch (this.dbType) {
      case 'mysql':
        return `\`${cleaned}\``;
      case 'postgresql':
        return `"${cleaned}"`;
      case 'mssql':
        return `[${cleaned}]`;
      case 'oracle':
        return `"${cleaned.toUpperCase()}"`;
      case 'sqlite':
        return `\`${cleaned}\``;
      default:
        return `\`${cleaned}\``;
    }
  }

  // 安全的静态方法
  static buildInsert(table: string, data: Record<string, QueryParameter>, dbType: DatabaseType = 'mysql'): QueryBuildResult {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => QueryBuilder.getParameterPlaceholderStatic(index + 1, dbType)).join(', ');
    
    // 验证并转义表名和字段名
    const cleanTable = table.replace(/[^\w\$]/g, '');
    if (!cleanTable) {
      throw new Error(`Invalid table name: '${table}' - table name cannot be empty after sanitization`);
    }
    
    const escapedKeys = keys.map(key => {
      const cleanKey = key.replace(/[^\w\$]/g, '');
      if (!cleanKey) {
        throw new Error(`Invalid column name: '${key}' - column name cannot be empty after sanitization`);
      }
      return QueryBuilder.escapeIdentifierStatic(cleanKey, dbType);
    });
    
    const escapedTable = QueryBuilder.escapeIdentifierStatic(cleanTable, dbType);
    const query = `INSERT INTO ${escapedTable} (${escapedKeys.join(', ')}) VALUES (${placeholders})`;
    return { query, params: values };
  }

  static buildUpdate(table: string, data: Record<string, QueryParameter>, criteria: Record<string, QueryParameter>, dbType: DatabaseType = 'mysql'): QueryBuildResult {
    const dataKeys = Object.keys(data);
    const criteriaKeys = Object.keys(criteria);

    if (dataKeys.length === 0 || criteriaKeys.length === 0) {
      throw new Error('Update operation requires both data and criteria.');
    }

    // 验证并转义表名
    const cleanTable = table.replace(/[^\w\$]/g, '');
    if (!cleanTable) {
      throw new Error(`Invalid table name: '${table}' - table name cannot be empty after sanitization`);
    }

    let paramIndex = 1;
    const setClause = dataKeys.map(key => {
      const cleanKey = key.replace(/[^\w\$]/g, '');
      if (!cleanKey) {
        throw new Error(`Invalid column name: '${key}' - column name cannot be empty after sanitization`);
      }
      const escaped = QueryBuilder.escapeIdentifierStatic(cleanKey, dbType);
      const placeholder = QueryBuilder.getParameterPlaceholderStatic(paramIndex++, dbType);
      return `${escaped} = ${placeholder}`;
    }).join(', ');
    
    const whereConditions = criteriaKeys.map(key => {
      const cleanKey = key.replace(/[^\w\$]/g, '');
      if (!cleanKey) {
        throw new Error(`Invalid column name: '${key}' - column name cannot be empty after sanitization`);
      }
      const escaped = QueryBuilder.escapeIdentifierStatic(cleanKey, dbType);
      const placeholder = QueryBuilder.getParameterPlaceholderStatic(paramIndex++, dbType);
      return `${escaped} = ${placeholder}`;
    });
    
    const whereClause = whereConditions.length > 0 ? whereConditions.join(' AND ') : '';
    
    const escapedTable = QueryBuilder.escapeIdentifierStatic(cleanTable, dbType);
    
    let query = `UPDATE ${escapedTable} SET ${setClause}`;
    
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    
    const params = [...Object.values(data), ...Object.values(criteria)];

    return { query, params };
  }

  static buildDelete(table: string, criteria: Record<string, QueryParameter>, dbType: DatabaseType = 'mysql'): QueryBuildResult {
    const keys = Object.keys(criteria);
    if (keys.length === 0) {
      throw new Error('Delete operation requires criteria.');
    }
    
    // 验证并转义表名
    const cleanTable = table.replace(/[^\w\$]/g, '');
    if (!cleanTable) {
      throw new Error(`Invalid table name: '${table}' - table name cannot be empty after sanitization`);
    }
    
    const whereClause = keys.map((key, index) => {
      const cleanKey = key.replace(/[^\w\$]/g, '');
      if (!cleanKey) {
        throw new Error(`Invalid column name: '${key}' - column name cannot be empty after sanitization`);
      }
      const placeholder = QueryBuilder.getParameterPlaceholderStatic(index + 1, dbType);
      return `${QueryBuilder.escapeIdentifierStatic(cleanKey, dbType)} = ${placeholder}`;
    }).join(' AND ');
    
    const escapedTable = QueryBuilder.escapeIdentifierStatic(cleanTable, dbType);
    const query = `DELETE FROM ${escapedTable} WHERE ${whereClause}`;
    const params = Object.values(criteria);

    return { query, params };
  }

  // 静态版本的标识符转义方法
  private static escapeIdentifierStatic(identifier: string, dbType: DatabaseType): string {
    if (!identifier || identifier.trim() === '') {
      throw new Error(`Invalid identifier: identifier cannot be empty`);
    }
    
    switch (dbType) {
      case 'mysql':
        return `\`${identifier}\``;
      case 'postgresql':
        return `"${identifier}"`;
      case 'mssql':
        return `[${identifier}]`;
      case 'oracle':
        return `"${identifier.toUpperCase()}"`;
      case 'sqlite':
        return `\`${identifier}\``;
      default:
        return `\`${identifier}\``;
    }
  }

  // 静态版本的参数占位符方法
  private static getParameterPlaceholderStatic(index: number, dbType: DatabaseType): string {
    switch (dbType) {
      case 'postgresql':
        return `$${index}`;
      case 'mssql':
        return `@param${index}`;
      case 'oracle':
        return `:param${index}`;
      default:
        return '?';
    }
  }

  // 查询安全检查
  validateQuery(): QueryValidationResult {
    const errors: DatabaseError[] = [];
    const warnings: string[] = [];

    if (!this.fromTable) {
      errors.push({
        code: 'MISSING_FROM_TABLE',
        message: 'FROM table is required',
        category: 'QUERY',
        level: 'HIGH',
        timestamp: new Date()
      });
    }

    if (this.selectFields.length === 0) {
      warnings.push('No SELECT fields specified, using *');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // 添加便捷方法
  distinct(): this {
    this.distinctFlag = true;
    return this;
  }

  forUpdate(): this {
    this.forUpdateFlag = true;
    return this;
  }

  from(table: string, alias?: string): this {
    this.fromTable = table;
    this.fromAlias = alias;
    return this;
  }
}