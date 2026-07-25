'use strict';

const {
  GenerationPipeline
} = require('../src/pipeline/generation-pipeline');

describe('GenerationPipeline', () => {
  test('ejecuta las etapas en el orden correcto', async () => {
    const executionOrder = [];

    const contextBuilder = {
      async build(input) {
        executionOrder.push('context');

        return {
          schema: input.schema,
          table: input.table
        };
      }
    };

    const intelligenceEngine = {
      async analyze(context) {
        executionOrder.push('intelligence');

        return {
          ...context,
          intelligenceApplied: true
        };
      }
    };

    const ruleEngine = {
      async apply(context) {
        executionOrder.push('rules');

        return {
          ...context,
          rulesApplied: true
        };
      }
    };

    const apiGenerator = {
      async generate(context, options) {
        executionOrder.push('generator');

        expect(context.rulesApplied).toBe(true);

        expect(options).toEqual({
          force: true
        });

        return {
          outputPath: 'output/example'
        };
      }
    };

    const pipeline = new GenerationPipeline({
      contextBuilder,
      intelligenceEngine,
      ruleEngine,
      generators: {
        api: apiGenerator
      }
    });

    const result = await pipeline.execute({
      type: 'api',

      definition: {
        schema: 'public',
        table: 'example_table'
      },

      options: {
        force: true
      }
    });

    expect(executionOrder).toEqual([
      'context',
      'intelligence',
      'rules',
      'generator'
    ]);

    expect(result.context).toMatchObject({
      schema: 'public',
      table: 'example_table',
      intelligenceApplied: true,
      rulesApplied: true
    });

    expect(result.generation).toEqual({
      outputPath: 'output/example'
    });
  });

  test('falla cuando el tipo de generador no existe', async () => {
    const pipeline = new GenerationPipeline({
      contextBuilder: {
        build() {}
      },

      intelligenceEngine: {
        analyze() {}
      },

      ruleEngine: {
        apply() {}
      },

      generators: {}
    });

    await expect(
      pipeline.execute({
        type: 'unknown',
        definition: {}
      })
    ).rejects.toThrow(
      'No existe un generador registrado para el tipo "unknown".'
    );
  });

  test('valida las dependencias requeridas', () => {
    expect(
      () => new GenerationPipeline()
    ).toThrow(
      'GenerationPipeline requiere un contextBuilder con build().'
    );
  });
});