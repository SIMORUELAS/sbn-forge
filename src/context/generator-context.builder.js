'use strict';

const naming = require('../core/naming');
const MetadataNormalizer = require('./metadata-normalizer');
const CapabilityDetector = require('./capability-detector');
const GeneratorContextValidator = require(
  './generator-context.validator'
);

class GeneratorContextBuilder {
  constructor(dependencies = {}) {
    this.metadataNormalizer =
      dependencies.metadataNormalizer ||
      new MetadataNormalizer();

    this.capabilityDetector =
      dependencies.capabilityDetector ||
      new CapabilityDetector();

    this.validator =
      dependencies.validator ||
      new GeneratorContextValidator();
  }

  build(input = {}) {
    const metadata =
      this.metadataNormalizer.normalize(input);

    const capabilities =
      this.capabilityDetector.detect(metadata);

    const names = this.buildNames(metadata.table);

    const context = {
      forge: {
        contextVersion: '1.0.0',
        generatedAt: new Date().toISOString()
      },

      source: metadata.source,

      database: {
        schema: metadata.schema,
        table: metadata.table
      },

      names,

      columns: metadata.columns,

      primaryKey: metadata.primaryKey,

      foreignKeys: metadata.foreignKeys,

      indexes: metadata.indexes,

      constraints: metadata.constraints,

      capabilities,

      generation: {
        backend: true,
        frontend: false,
        documentation: true,
        tests: true
      }
    };

    return this.validator.validateOrThrow(context);
  }

  buildNames(tableName) {
    /*
     * En este punto usamos las funciones de naming
     * disponibles en el proyecto.
     *
     * Las llamadas pueden necesitar un ajuste pequeño
     * dependiendo de los nombres exactos exportados
     * actualmente por src/core/naming.js.
     */

    const moduleName =
      typeof naming.toKebabCase === 'function'
        ? naming.toKebabCase(tableName)
        : tableName.replaceAll('_', '-');

    const entityName =
      typeof naming.toPascalCase === 'function'
        ? naming.toPascalCase(tableName)
        : this.toPascalCase(tableName);

    const camelName =
      typeof naming.toCamelCase === 'function'
        ? naming.toCamelCase(tableName)
        : this.toCamelCase(tableName);

    return {
      table: tableName,
      module: moduleName,
      entity: entityName,
      variable: camelName,
      route: moduleName,
      permissionPrefix: tableName.toUpperCase()
    };
  }

  toPascalCase(value) {
    return value
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0).toUpperCase() +
          part.slice(1).toLowerCase()
      )
      .join('');
  }

  toCamelCase(value) {
    const pascalValue = this.toPascalCase(value);

    return (
      pascalValue.charAt(0).toLowerCase() +
      pascalValue.slice(1)
    );
  }
}

module.exports = GeneratorContextBuilder;