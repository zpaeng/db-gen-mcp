import { DatabaseConfig } from '../types';

export interface PaginationOptions {
  page: number;
  pageSize: number;
  maxPageSize?: number;
}

export interface PaginationResult<T = any> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PaginationHandler {
  private static readonly DEFAULT_PAGE_SIZE = 20;
  private static readonly MAX_PAGE_SIZE = 1000;

  /**
   * 验证和标准化分页参数
   */
  static validatePaginationOptions(options: Partial<PaginationOptions>): PaginationOptions {
    const page = Math.max(1, options.page || 1);
    const maxPageSize = options.maxPageSize || this.MAX_PAGE_SIZE;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(1, options.pageSize || this.DEFAULT_PAGE_SIZE)
    );

    return { page, pageSize, maxPageSize };
  }

  /**
   * 计算偏移量
   */
  static calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  /**
   * 计算总页数
   */
  static calculateTotalPages(total: number, pageSize: number): number {
    return Math.ceil(total / pageSize);
  }

  /**
   * 构建分页查询的LIMIT和OFFSET子句
   */
  static buildLimitClause(dbType: string, page: number, pageSize: number): string {
    const offset = this.calculateOffset(page, pageSize);

    switch (dbType.toLowerCase()) {
      case 'mssql':
        // SQL Server 使用 OFFSET...FETCH
        return `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
      
      case 'oracle':
        // Oracle 使用 ROWNUM 或 OFFSET...FETCH (12c+)
        return `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
      
      default:
        // MySQL, PostgreSQL, SQLite 使用 LIMIT...OFFSET
        return `LIMIT ${pageSize} OFFSET ${offset}`;
    }
  }

  /**
   * 构建计数查询
   */
  static buildCountQuery(originalQuery: string): string {
    // 移除 ORDER BY 子句（如果存在）
    const queryWithoutOrderBy = originalQuery.replace(/\s+ORDER\s+BY\s+[^)]*$/i, '');
    
    // 移除 LIMIT/OFFSET 子句
    const cleanQuery = queryWithoutOrderBy
      .replace(/\s+LIMIT\s+\d+(\s+OFFSET\s+\d+)?$/i, '')
      .replace(/\s+OFFSET\s+\d+\s+ROWS(\s+FETCH\s+NEXT\s+\d+\s+ROWS\s+ONLY)?$/i, '');

    // 如果查询包含 GROUP BY，需要特殊处理
    if (/\s+GROUP\s+BY\s+/i.test(cleanQuery)) {
      return `SELECT COUNT(*) as total FROM (${cleanQuery}) as count_subquery`;
    }

    // 简单的 COUNT 查询
    const fromIndex = cleanQuery.toLowerCase().indexOf('from');
    if (fromIndex === -1) {
      throw new Error('Invalid query: FROM clause not found');
    }

    const fromClause = cleanQuery.substring(fromIndex);
    return `SELECT COUNT(*) as total ${fromClause}`;
  }

  /**
   * 为查询添加分页
   */
  static addPaginationToQuery(
    query: string,
    dbType: string,
    page: number,
    pageSize: number
  ): string {
    const limitClause = this.buildLimitClause(dbType, page, pageSize);
    
    // 检查查询是否已经有 ORDER BY
    if (!/\s+ORDER\s+BY\s+/i.test(query)) {
      // 如果没有 ORDER BY，添加一个默认的排序以确保分页结果的一致性
      query += ' ORDER BY 1';
    }

    return `${query} ${limitClause}`;
  }

  /**
   * 创建分页结果对象
   */
  static createPaginationResult<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number
  ): PaginationResult<T> {
    const totalPages = this.calculateTotalPages(total, pageSize);
    
    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 获取分页信息摘要
   */
  static getPaginationSummary(
    page: number,
    pageSize: number,
    total: number
  ): string {
    const start = this.calculateOffset(page, pageSize) + 1;
    const end = Math.min(start + pageSize - 1, total);
    const totalPages = this.calculateTotalPages(total, pageSize);

    return `显示第 ${start}-${end} 条记录，共 ${total} 条记录，第 ${page}/${totalPages} 页`;
  }

  /**
   * 验证分页参数是否有效
   */
  static isValidPagination(page: number, pageSize: number, total: number): boolean {
    if (page < 1 || pageSize < 1) {
      return false;
    }

    if (total === 0) {
      return page === 1;
    }

    const totalPages = this.calculateTotalPages(total, pageSize);
    return page <= totalPages;
  }

  /**
   * 获取相邻页码
   */
  static getAdjacentPages(
    currentPage: number,
    totalPages: number,
    range: number = 2
  ): number[] {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - range);
    const end = Math.min(totalPages, currentPage + range);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * 生成分页导航信息
   */
  static generatePaginationNav(
    page: number,
    pageSize: number,
    total: number,
    range: number = 2
  ): {
    current: number;
    totalPages: number;
    pages: number[];
    hasFirst: boolean;
    hasLast: boolean;
    hasPrev: boolean;
    hasNext: boolean;
    prev?: number;
    next?: number;
  } {
    const totalPages = this.calculateTotalPages(total, pageSize);
    const pages = this.getAdjacentPages(page, totalPages, range);

    return {
      current: page,
      totalPages,
      pages,
      hasFirst: pages[0] > 1,
      hasLast: pages[pages.length - 1] < totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      prev: page > 1 ? page - 1 : undefined,
      next: page < totalPages ? page + 1 : undefined
    };
  }
}