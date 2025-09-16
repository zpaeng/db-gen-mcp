import { MetadataAnalyzer } from '../../metadata/analyzer';
import { CodeGenConfig, DatabaseConfig } from '../../types';
import { TemplateEngine } from '../engine';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';
import { StringUtils, TypeMapper, PathUtils } from '../../utils/helpers';

export class EntityGenerator {
  private metadataAnalyzer: MetadataAnalyzer;
  private codeGenConfig: CodeGenConfig;

  constructor(dbConfig: DatabaseConfig, codeGenConfig: CodeGenConfig) {
    this.metadataAnalyzer = new MetadataAnalyzer(dbConfig);
    this.codeGenConfig = codeGenConfig;
  }

  async generate(tableName: string): Promise<void> {
    logger.debug(`Generating Entity for table: ${tableName}`);
    
    const schemaResult = await this.metadataAnalyzer.getTableSchema(tableName);
    if (!schemaResult.success || !schemaResult.data) {
      throw new Error(`Failed to get schema for table ${tableName}: ${schemaResult.error?.message}`);
    }
    
    const schema = schemaResult.data;
    const entityName = StringUtils.toPascalCase(tableName);
    
    // 获取所有需要的导入
    const imports = new Set<string>();
    const columns = schema.columns.map((col: any) => {
      const javaType = TypeMapper.mapDbTypeToJavaType(col.type);
      const typeImports = TypeMapper.getJavaTypeImports(javaType);
      typeImports.forEach(imp => imports.add(imp));
      
      return {
        columnName: col.name,
        fieldName: StringUtils.toCamelCase(col.name),
        javaType,
        comment: col.comment || '',
        isPrimaryKey: col.primaryKey,
      };
    });
    
    const data = {
      packageName: this.codeGenConfig.packageName,
      entityName,
      tableName,
      tableComment: 'TODO: Get table comment from schema',
      author: this.codeGenConfig.author || 'db-gen-mcp',
      date: new Date().toISOString(),
      enableSwagger: this.codeGenConfig.enableSwagger,
      imports: Array.from(imports),
      columns,
    };

    const content = await TemplateEngine.render('entity', data);
    const outputPath = PathUtils.join(this.codeGenConfig.outputPath, 'entity');
    await fs.mkdir(outputPath, { recursive: true });
    
    const filePath = PathUtils.join(outputPath, `${entityName}.java`);
    await fs.writeFile(filePath, content);
    
    logger.logCodeGeneration('Entity', tableName, filePath);
  }

}