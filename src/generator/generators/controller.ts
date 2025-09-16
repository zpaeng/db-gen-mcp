import { CodeGenConfig } from '../../types';
import { TemplateEngine } from '../engine';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger';
import { StringUtils, PathUtils } from '../../utils/helpers';

export class ControllerGenerator {
  private codeGenConfig: CodeGenConfig;

  constructor(codeGenConfig: CodeGenConfig) {
    this.codeGenConfig = codeGenConfig;
  }

  async generate(tableName: string): Promise<void> {
    logger.debug(`Generating Controller for table: ${tableName}`);
    
    const entityName = StringUtils.toPascalCase(tableName);
    const data = {
      packageName: this.codeGenConfig.packageName,
      entityName,
      lowerCaseEntityName: StringUtils.toCamelCase(tableName),
      author: this.codeGenConfig.author || 'db-gen-mcp',
      date: new Date().toISOString(),
    };

    const content = await TemplateEngine.render('controller', data);
    const outputPath = PathUtils.join(this.codeGenConfig.outputPath, 'controller');
    await fs.mkdir(outputPath, { recursive: true });
    
    const filePath = PathUtils.join(outputPath, `${entityName}Controller.java`);
    await fs.writeFile(filePath, content);
    
    logger.logCodeGeneration('Controller', tableName, filePath);
  }
}