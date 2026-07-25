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

    if (
      !metadata ||
      typeof metadata !== 'object'
    ) {
      throw new TypeError(
        'MetadataNormalizer debe devolver un objeto válido'
      );
    }

    if (
      typeof metadata.table !== 'string' ||
      metadata.table.trim() === ''
    ) {
      throw new TypeError(
        'GeneratorContextBuilder requiere el nombre de la tabla'
      );
    }

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
    if (
      typeof tableName !== 'string' ||
      tableName.trim() === ''
    ) {
      throw new TypeError(
        'buildNames requiere un nombre de tabla válido'
      );
    }

    const normalizedTableName = tableName.trim();

    const moduleName =
      typeof naming.toKebabCase === 'function'
        ? naming.toKebabCase(normalizedTableName)
        : normalizedTableName.replaceAll('_', '-');

    const entityName =
      typeof naming.toPascalCase === 'function'
        ? naming.toPascalCase(normalizedTableName)
        : this.toPascalCase(normalizedTableName);

    const camelName =
      typeof naming.toCamelCase === 'function'
        ? naming.toCamelCase(normalizedTableName)
        : this.toCamelCase(normalizedTableName);

    return {
      table: normalizedTableName,
      module: moduleName,
      entity: entityName,
      variable: camelName,
      route: moduleName,
      permissionPrefix:
        normalizedTableName.toUpperCase()
    };
  }

  toPascalCase(value) {
    if (typeof value !== 'string') {
      throw new TypeError(
        'toPascalCase requiere una cadena de texto'
      );
    }

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

    if (pascalValue === '') {
      return '';
    }

    return (
      pascalValue.charAt(0).toLowerCase() +
      pascalValue.slice(1)
    );
  }
}

module.exports = GeneratorContextBuilder;