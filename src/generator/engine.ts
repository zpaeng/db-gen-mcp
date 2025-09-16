import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { StringUtils } from '../utils/helpers';

export class TemplateEngine {
  private static templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private static helpersRegistered = false;

  private static registerHelpers() {
    if (this.helpersRegistered) return;

    // 注册字符串处理助手函数
    handlebars.registerHelper('lowercase', function(str: string) {
      return str ? str.toLowerCase() : '';
    });

    handlebars.registerHelper('uppercase', function(str: string) {
      return str ? str.toUpperCase() : '';
    });

    handlebars.registerHelper('capitalize', function(str: string) {
      return str ? StringUtils.capitalize(str) : '';
    });

    handlebars.registerHelper('uncapitalize', function(str: string) {
      return str ? StringUtils.uncapitalize(str) : '';
    });

    handlebars.registerHelper('camelCase', function(str: string) {
      return str ? StringUtils.toCamelCase(str) : '';
    });

    handlebars.registerHelper('pascalCase', function(str: string) {
      return str ? StringUtils.toPascalCase(str) : '';
    });

    handlebars.registerHelper('snakeCase', function(str: string) {
      return str ? StringUtils.toSnakeCase(str) : '';
    });

    handlebars.registerHelper('kebabCase', function(str: string) {
      return str ? StringUtils.toKebabCase(str) : '';
    });

    this.helpersRegistered = true;
  }

  static async compileTemplate(templateName: string): Promise<handlebars.TemplateDelegate> {
    // 确保助手函数已注册
    this.registerHelpers();

    if (!this.templates.has(templateName)) {
      const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiledTemplate = handlebars.compile(templateContent);
      this.templates.set(templateName, compiledTemplate);
    }
    return this.templates.get(templateName)!;
  }

  static async render(templateName: string, data: any): Promise<string> {
    const template = await this.compileTemplate(templateName);
    return template(data);
  }
}