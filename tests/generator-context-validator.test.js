'use strict';

const GeneratorContextValidator = require(
  '../src/context/generator-context.validator'
);

describe('GeneratorContextValidator', () => {
  test('acepta un contexto completo', () => {
    const validator = new GeneratorContextValidator();

    const result = validator.validate({
      source: {
        type: 'json'
      },

      database: {
        schema: 'simo_ai',
        table: 'ai_business_models'
      },

      names: {
        entity: 'AiBusinessModels',
        module: 'ai-business-models'
      },

      columns: [
        {
          name: 'id'
        }
      ],

      capabilities: {
        crud: true
      }
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('rechaza un contexto incompleto', () => {
    const validator = new GeneratorContextValidator();

    const result = validator.validate({
      columns: []
    });

    expect(result.valid).toBe(false);

    expect(result.errors).toContain(
      'source.type es obligatorio'
    );

    expect(result.errors).toContain(
      'database.table es obligatorio'
    );
  });
});