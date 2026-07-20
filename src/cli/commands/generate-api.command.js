'use strict';
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const { loadConfig } = require('../../core/config-loader');
const { loadDefinition } = require('../../core/definition-loader');
const { createGeneratorContext } = require('../../core/generator-context');
const { generateApi } = require('../../generators/backend/api-generator');
const { Logger } = require('../../core/logger');

function registerGenerateApiCommand(parent) {
  parent.command('api <table>')
    .description('Genera un módulo backend Fastify CommonJS desde una definición JSON')
    .option('-s, --schema <schema>', 'Schema PostgreSQL')
    .option('-d, --definition <file>', 'Archivo JSON de definición')
    .option('-o, --output <directory>', 'Directorio de salida')
    .option('--force', 'Autoriza sobrescritura de archivos generados', false)
    .option('--dry-run', 'Muestra el plan sin escribir archivos', false)
    .option('--quiet', 'Reduce la salida del CLI', false)
    .action(async (table, options) => {
      const cwd = process.cwd();
      const config = await loadConfig(cwd);
      const logger = new Logger({ quiet: options.quiet });
      const definitionPath = options.definition || path.join(cwd, 'examples', `${table}.json`);
      const output = path.resolve(cwd, options.output || config.defaultOutput || './output');
      const spinner = options.quiet ? null : ora('Preparando Generator Context').start();
      try {
        const definition = await loadDefinition(definitionPath);
        if (options.schema) {definition.schema = options.schema;}
        if (definition.table !== table) {throw new Error(`La tabla del comando (${table}) no coincide con la definición (${definition.table}).`);}
        const context = createGeneratorContext(definition, { generatorVersion: '0.1.0' });
        spinner?.succeed('Generator Context validado');
        const result = await generateApi(context, { output, force: options.force, dryRun: options.dryRun, logger });
        logger.success(options.dryRun ? `Dry-run completado: ${result.files.length} archivos planificados.` : `Módulo generado: ${result.moduleDirectory}`);
        if (!options.quiet) {
          console.log(chalk.gray(`Manifest: ${result.manifestPath}`));
          for (const file of result.files) {console.log(chalk.gray(`  ${options.dryRun ? '[plan]' : '[ok]'} ${file.relativePath}`));}
        }
      } catch (error) {
        spinner?.fail('No fue posible generar el módulo');
        throw error;
      }
    });
}
module.exports = { registerGenerateApiCommand };
