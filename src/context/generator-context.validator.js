'use strict';

class GeneratorContextValidator {
  validate(context) {
    const errors = [];

    if (!context || typeof context !== 'object') {
      errors.push('El Generator Context debe ser un objeto');

      return {
        valid: false,
        errors
      };
    }

    if (!context.source?.type) {
      errors.push('source.type es obligatorio');
    }

    if (!context.database?.schema) {
      errors.push('database.schema es obligatorio');
    }

    if (!context.database?.table) {
      errors.push('database.table es obligatorio');
    }

    if (!context.names?.entity) {
      errors.push('names.entity es obligatorio');
    }

    if (!context.names?.module) {
      errors.push('names.module es obligatorio');
    }

    if (
      !Array.isArray(context.columns) ||
      context.columns.length === 0
    ) {
      errors.push(
        'columns debe contener al menos una columna'
      );
    }

    if (!context.capabilities) {
      errors.push('capabilities es obligatorio');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateOrThrow(context) {
    const result = this.validate(context);

    if (!result.valid) {
      throw new Error(
        `Generator Context inválido: ${result.errors.join(', ')}`
      );
    }

    return context;
  }
}

module.exports = GeneratorContextValidator;