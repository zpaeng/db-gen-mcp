import { CodeGenConfig, DatabaseConfig } from '../../types';
import { EntityGenerator } from './entity';
import { MapperGenerator } from './mapper';
import { ServiceGenerator } from './service';
import { ControllerGenerator } from './controller';
import { MetadataAnalyzer } from '../../metadata/analyzer';
import { DatabaseManager } from '../../database/manager';
import { logger } from '../../utils/logger';
import { TimeUtils } from '../../utils/helpers';

export class CodeGenerator {
  private dbConfig: DatabaseConfig;
  private codeGenConfig: CodeGenConfig;
  private metadataAnalyzer: MetadataAnalyzer;

  constructor(dbConfig: DatabaseConfig, codeGenConfig: CodeGenConfig) {
    this.dbConfig = dbConfig;
    this.codeGenConfig = codeGenConfig;
    this.metadataAnalyzer = new MetadataAnalyzer(dbConfig);
  }

  async generateAll(tableName: string): Promise<void> {
    const startTime = TimeUtils.now();
    logger.info(`Starting code generation for table: ${tableName}`, {
      packageName: this.codeGenConfig.packageName,
      outputPath: this.codeGenConfig.outputPath
    });

    const entityGenerator = new EntityGenerator(this.dbConfig, this.codeGenConfig);
    const mapperGenerator = new MapperGenerator(this.codeGenConfig);
    const serviceGenerator = new ServiceGenerator(this.codeGenConfig);
    const controllerGenerator = new ControllerGenerator(this.codeGenConfig);

    try {
      await entityGenerator.generate(tableName);
      await mapperGenerator.generate(tableName);
      await serviceGenerator.generate(tableName);
      await controllerGenerator.generate(tableName);

      const duration = TimeUtils.now() - startTime;
      logger.info(`Code generation completed successfully for table: ${tableName}`, {
        duration: TimeUtils.formatDuration(duration),
        outputPath: this.codeGenConfig.outputPath
      });
      logger.logPerformance('code_generation_all', duration);
    } catch (error) {
      const duration = TimeUtils.now() - startTime;
      logger.error(`Code generation failed for table: ${tableName}`, error);
      logger.logPerformance('code_generation_failed', duration);
      throw error;
    }
  }
}