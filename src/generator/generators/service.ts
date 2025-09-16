import { CodeGenConfig } from '../../types';
import { TemplateEngine } from '../engine';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger';
import { StringUtils, PathUtils } from '../../utils/helpers';

export class ServiceGenerator {
  private codeGenConfig: CodeGenConfig;

  constructor(codeGenConfig: CodeGenConfig) {
    this.codeGenConfig = codeGenConfig;
  }

  async generate(tableName: string): Promise<void> {
    logger.debug(`Generating Service for table: ${tableName}`);
    
    const entityName = StringUtils.toPascalCase(tableName);
    const data = {
      packageName: this.codeGenConfig.packageName,
      entityName,
      author: this.codeGenConfig.author || 'db-gen-mcp',
      date: new Date().toISOString(),
    };

    // Generate Service interface
    const serviceContent = await TemplateEngine.render('service', data);
    const outputPath = PathUtils.join(this.codeGenConfig.outputPath, 'service');
    await fs.mkdir(outputPath, { recursive: true });
    
    const serviceFilePath = PathUtils.join(outputPath, `I${entityName}Service.java`);
    await fs.writeFile(serviceFilePath, serviceContent);
    logger.logCodeGeneration('Service Interface', tableName, serviceFilePath);

    // Generate Service implementation
    const serviceImplContent = await TemplateEngine.render('serviceImpl', data);
    const implOutputPath = PathUtils.join(outputPath, 'impl');
    await fs.mkdir(implOutputPath, { recursive: true });
    
    const implFilePath = PathUtils.join(implOutputPath, `${entityName}ServiceImpl.java`);
    await fs.writeFile(implFilePath, serviceImplContent);
    logger.logCodeGeneration('Service Implementation', tableName, implFilePath);
  }
}