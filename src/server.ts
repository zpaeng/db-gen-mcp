import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseConfig, CodeGenConfig } from './types/index';
import { ConnectionTester } from './utils/connection-tester';
import { MetadataAnalyzer } from './metadata/analyzer';
import { QueryExecutor } from './query/executor';
import { CodeGenerator } from './generator/generators/main';
import { logger } from './utils/logger';
import { ValidationUtils, TimeUtils } from './utils/helpers';

export class DatabaseMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'database-generator-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // 列出所有可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'test_connection',
            description: '测试数据库连接',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                }
              },
              required: ['config']
            }
          },
          {
            name: 'list_tables',
            description: '获取数据库中的所有表',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                }
              },
              required: ['config']
            }
          },
          {
            name: 'get_table_schema',
            description: '获取指定表的结构信息',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                tableName: { type: 'string' }
              },
              required: ['config', 'tableName']
            }
          },
          {
            name: 'execute_query',
            description: '执行SQL查询',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                query: { type: 'string' },
                params: { type: 'array', items: { type: 'any' } }
              },
              required: ['config', 'query']
            }
          },
          {
            name: 'crud_create',
            description: '在指定表中创建新记录',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                tableName: { type: 'string' },
                data: { type: 'object' }
              },
              required: ['config', 'tableName', 'data']
            }
          },
          {
            name: 'crud_read',
            description: '从指定表中读取记录',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                tableName: { type: 'string' },
                criteria: { type: 'object' },
                limit: { type: 'number' },
                offset: { type: 'number' }
              },
              required: ['config', 'tableName']
            }
          },
          {
            name: 'crud_update',
            description: '更新指定表中的记录',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                tableName: { type: 'string' },
                data: { type: 'object' },
                criteria: { type: 'object' }
              },
              required: ['config', 'tableName', 'data', 'criteria']
            }
          },
          {
            name: 'crud_delete',
            description: '删除指定表中的记录',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                tableName: { type: 'string' },
                criteria: { type: 'object' }
              },
              required: ['config', 'tableName', 'criteria']
            }
          },
          {
            name: 'paginate',
            description: '分页查询指定表中的记录',
            inputSchema: {
              type: 'object',
              properties: {
                config: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                tableName: { type: 'string' },
                page: { type: 'number' },
                pageSize: { type: 'number' },
                criteria: { type: 'object' }
              },
              required: ['config', 'tableName', 'page', 'pageSize']
            }
          },
          {
            name: 'generate_java_code',
            description: '为指定表生成Java代码（Entity、Mapper、Service、Controller）',
            inputSchema: {
              type: 'object',
              properties: {
                dbConfig: {
                  type: 'object',
                  properties: {
                    type: { type: 'string', enum: ['mysql', 'postgresql', 'sqlite', 'mssql', 'oracle'] },
                    host: { type: 'string' },
                    port: { type: 'number' },
                    user: { type: 'string' },
                    password: { type: 'string' },
                    database: { type: 'string' }
                  },
                  required: ['type', 'host', 'user', 'password', 'database']
                },
                codeGenConfig: {
                  type: 'object',
                  properties: {
                    packageName: { type: 'string' },
                    outputPath: { type: 'string' },
                    author: { type: 'string' },
                    enableSwagger: { type: 'boolean' }
                  },
                  required: ['packageName', 'outputPath']
                },
                tableName: { type: 'string' }
              },
              required: ['dbConfig', 'codeGenConfig', 'tableName']
            }
          }
        ]
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new McpError(ErrorCode.InvalidParams, 'Missing arguments');
      }

      try {
        switch (name) {
          case 'test_connection':
            return await this.handleTestConnection(args.config as DatabaseConfig);

          case 'list_tables':
            return await this.handleListTables(args.config as DatabaseConfig);

          case 'get_table_schema':
            return await this.handleGetTableSchema(args.config as DatabaseConfig, args.tableName as string);

          case 'execute_query':
            return await this.handleExecuteQuery(args.config as DatabaseConfig, args.query as string, args.params as any[]);

          case 'crud_create':
            return await this.handleCrudCreate(args.config as DatabaseConfig, args.tableName as string, args.data as Record<string, any>);

          case 'crud_read':
            return await this.handleCrudRead(args.config as DatabaseConfig, args.tableName as string, args.criteria as Record<string, any>, args.limit as number, args.offset as number);

          case 'crud_update':
            return await this.handleCrudUpdate(args.config as DatabaseConfig, args.tableName as string, args.data as Record<string, any>, args.criteria as Record<string, any>);

          case 'crud_delete':
            return await this.handleCrudDelete(args.config as DatabaseConfig, args.tableName as string, args.criteria as Record<string, any>);

          case 'paginate':
            return await this.handlePaginate(args.config as DatabaseConfig, args.tableName as string, args.page as number, args.pageSize as number, args.criteria as Record<string, any>);

          case 'generate_java_code':
            return await this.handleGenerateJavaCode(args.dbConfig as DatabaseConfig, args.codeGenConfig as CodeGenConfig, args.tableName as string);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * 将MCP输入配置映射为DatabaseConfig
   * @param inputConfig MCP工具的输入配置
   * @returns 标准的DatabaseConfig
   */
  private mapInputConfigToDatabaseConfig(inputConfig: any): DatabaseConfig {
    return {
      type: inputConfig.type,
      host: inputConfig.host,
      port: inputConfig.port,
      database: inputConfig.database,
      username: inputConfig.user, // 映射 user -> username
      password: inputConfig.password,
      filename: inputConfig.filename,
      options: inputConfig.options
    };
  }

  private async handleTestConnection(inputConfig: any) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const result = await ConnectionTester.testConnection(config);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async handleListTables(inputConfig: any) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const startTime = TimeUtils.now();
    logger.logToolCall('list_tables', config);
    
    const analyzer = new MetadataAnalyzer(config);
    const tables = await analyzer.getTables();
    const duration = TimeUtils.now() - startTime;
    
    logger.logDatabaseOperation('list_tables', 'all_tables', duration, { tableCount: tables.length });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tables }, null, 2)
        }
      ]
    };
  }

  private async handleGetTableSchema(inputConfig: any, tableName: string) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const startTime = TimeUtils.now();
    logger.logToolCall('get_table_schema', { config, tableName });
    
    // 验证表名
    if (!ValidationUtils.validateTableName(tableName)) {
      logger.error('Invalid table name', { tableName });
      throw new McpError(ErrorCode.InvalidParams, `Invalid table name: ${tableName}`);
    }
    
    const analyzer = new MetadataAnalyzer(config);
    const schema = await analyzer.getTableSchema(tableName);
    const duration = TimeUtils.now() - startTime;
    
    logger.logDatabaseOperation('get_table_schema', tableName, duration, { columnCount: schema.length });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tableName, schema }, null, 2)
        }
      ]
    };
  }

  private async handleExecuteQuery(inputConfig: any, query: string, params?: any[]) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const executor = new QueryExecutor(config);
    const result = await executor.executeQuery(query, params || []);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ query, params, result }, null, 2)
        }
      ]
    };
  }

  private async handleCrudCreate(inputConfig: any, tableName: string, data: Record<string, any>) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const executor = new QueryExecutor(config);
    const result = await executor.create(tableName, data);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ operation: 'create', tableName, data, result }, null, 2)
        }
      ]
    };
  }

  private async handleCrudRead(inputConfig: any, tableName: string, criteria?: Record<string, any>, limit?: number, offset?: number) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const executor = new QueryExecutor(config);
    const result = await executor.read(tableName, criteria || {}, limit, offset);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ operation: 'read', tableName, criteria, limit, offset, result }, null, 2)
        }
      ]
    };
  }

  private async handleCrudUpdate(inputConfig: any, tableName: string, data: Record<string, any>, criteria: Record<string, any>) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const executor = new QueryExecutor(config);
    const result = await executor.update(tableName, data, criteria);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ operation: 'update', tableName, data, criteria, result }, null, 2)
        }
      ]
    };
  }

  private async handleCrudDelete(inputConfig: any, tableName: string, criteria: Record<string, any>) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const executor = new QueryExecutor(config);
    const result = await executor.delete(tableName, criteria);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ operation: 'delete', tableName, criteria, result }, null, 2)
        }
      ]
    };
  }

  private async handlePaginate(inputConfig: any, tableName: string, page: number, pageSize: number, criteria?: Record<string, any>) {
    const config = this.mapInputConfigToDatabaseConfig(inputConfig);
    const executor = new QueryExecutor(config);
    const result = await executor.paginate(tableName, page, pageSize, criteria || {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ operation: 'paginate', tableName, page, pageSize, criteria, result }, null, 2)
        }
      ]
    };
  }

  private async handleGenerateJavaCode(inputDbConfig: any, codeGenConfig: CodeGenConfig, tableName: string) {
    const dbConfig = this.mapInputConfigToDatabaseConfig(inputDbConfig);
    const generator = new CodeGenerator(dbConfig, codeGenConfig);
    await generator.generateAll(tableName);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Java代码生成完成`,
            tableName,
            outputPath: codeGenConfig.outputPath,
            packageName: codeGenConfig.packageName
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Database Generator MCP Server running on stdio');
  }
}
