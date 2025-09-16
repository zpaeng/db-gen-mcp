import { CodeGenConfig } from '../../types';
import { TemplateEngine } from '../engine';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger';
import { StringUtils, PathUtils } from '../../utils/helpers';

export class MapperGenerator {
  private codeGenConfig: CodeGenConfig;

  constructor(codeGenConfig: CodeGenConfig) {
    this.codeGenConfig = codeGenConfig;
  }

  async generate(tableName: string): Promise<void> {
    logger.debug(`Generating Mapper for table: ${tableName}`);
    
    const entityName = StringUtils.toPascalCase(tableName);
    const data = {
      packageName: this.codeGenConfig.packageName,
      entityName,
      tableComment: 'TODO: Get table comment',
      author: this.codeGenConfig.author || 'db-gen-mcp',
      date: new Date().toISOString(),
    };

    const content = await TemplateEngine.render('mapper', data);
    const outputPath = PathUtils.join(this.codeGenConfig.outputPath, 'mapper');
    await fs.mkdir(outputPath, { recursive: true });
    
    const filePath = PathUtils.join(outputPath, `${entityName}Mapper.java`);
    await fs.writeFile(filePath, content);
    
    logger.logCodeGeneration('Mapper', tableName, filePath);
  }
}