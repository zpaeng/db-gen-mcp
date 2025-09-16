import { ConnectionPoolManager } from '../database/pool';
import { DatabaseConfig } from '../types';
import { PaginationHandler, PaginationResult } from './pagination';
import { QueryBuilder } from './builder';
import { QueryParameter } from '../types/adapters';
import { QueryResult, DatabaseOperationResult } from '../types/database';
import { logger } from '../utils/logger';

export class QueryExecutor {
  private readonly config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async executeQuery<T = Record<string, unknown>>(
    query: string,
    params: ReadonlyArray<QueryParameter> = []
  ): Promise<QueryResult<T>> {
    const adapter = await ConnectionPoolManager.getConnection(this.config);
    const result = await adapter.execute<T>(query, params);
    
    if (!result.success) {
      throw new Error(`Query execution failed: ${result.error?.message || 'Unknown error'}`);
    }
    
    return result.data!;
  }

  async create<T = Record<string, unknown>>(
    tableName: string,
    data: Record<string, QueryParameter>
  ): Promise<QueryResult<T>> {
    const { query, params } = QueryBuilder.buildInsert(tableName, data);
    return this.executeQuery<T>(query, params);
  }

  async read<T = Record<string, unknown>>(
    tableName: string,
    criteria: Record<string, QueryParameter> = {},
    limit?: number,
    offset?: number
  ): Promise<QueryResult<T>> {
    const builder = new QueryBuilder(this.config.type)
      .select('*')
      .from(tableName);

    // 添加查询条件
    Object.entries(criteria).forEach(([key, value]) => {
      builder.where(key, '=', value);
    });

    if (limit) {
      builder.limit(limit);
    }

    if (offset) {
      builder.offset(offset);
    }

    const { query, params } = builder.build();
    return this.executeQuery<T>(query, params);
  }

  async update<T = Record<string, unknown>>(
    tableName: string,
    data: Record<string, QueryParameter>,
    criteria: Record<string, QueryParameter>
  ): Promise<QueryResult<T>> {
    if (Object.keys(data).length === 0 || Object.keys(criteria).length === 0) {
      throw new Error('Update operation requires both data and criteria.');
    }

    const { query, params } = QueryBuilder.buildUpdate(tableName, data, criteria);
    return this.executeQuery<T>(query, params);
  }

  async delete<T = Record<string, unknown>>(
    tableName: string,
    criteria: Record<string, QueryParameter>
  ): Promise<QueryResult<T>> {
    if (Object.keys(criteria).length === 0) {
      throw new Error('Delete operation requires criteria.');
    }

    const { query, params } = QueryBuilder.buildDelete(tableName, criteria);
    return this.executeQuery<T>(query, params);
  }

  async paginate(tableName: string, page: number, pageSize: number, criteria: Record<string, any> = {}): Promise<PaginationResult> {
    logger.debug(`Paginating table: ${tableName}`, { page, pageSize, criteria });
    
    // 验证分页参数
    const paginationOptions = PaginationHandler.validatePaginationOptions({ page, pageSize });
    
    // 使用查询构建器构建查询
    const queryBuilder = new QueryBuilder(this.config.type)
      .select('*')
      .from(tableName);
    
    // 添加查询条件
    Object.entries(criteria).forEach(([key, value]) => {
      queryBuilder.where(key, '=', value);
    });
    
    // 构建计数查询
    const countBuilder = new QueryBuilder(this.config.type)
      .select('COUNT(*) as total')
      .from(tableName);
    
    Object.entries(criteria).forEach(([key, value]) => {
      countBuilder.where(key, '=', value);
    });
    
    const { query: countQuery, params: countParams } = countBuilder.build();
    const countResult = await this.executeQuery<{ total: number }>(countQuery, [...countParams]);
    const total = countResult.rows[0]?.total || 0;
    
    // 构建数据查询
    queryBuilder.limit(paginationOptions.pageSize).offset(PaginationHandler.calculateOffset(paginationOptions.page, paginationOptions.pageSize));
    const { query: dataQuery, params: dataParams } = queryBuilder.build();
    const dataResult = await this.executeQuery(dataQuery, [...dataParams]);
    
    return PaginationHandler.createPaginationResult([...dataResult.rows], total, paginationOptions.page, paginationOptions.pageSize);
  }
}