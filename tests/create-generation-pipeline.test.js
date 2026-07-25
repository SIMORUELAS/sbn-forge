'use strict';

const {
  createGenerationPipeline
} = require(
  '../src/pipeline/create-generation-pipeline'
);

const {
  GenerationPipeline
} = require(
  '../src/pipeline/generation-pipeline'
);

describe('createGenerationPipeline', () => {
  test('crea una instancia de GenerationPipeline', () => {
    const pipeline =
      createGenerationPipeline();

    expect(pipeline).toBeInstanceOf(
      GenerationPipeline
    );
  });

  test('permite inyectar dependencias', async () => {
    const contextBuilder = {
      build(definition) {
        return {
          ...definition,
          contextBuilt: true
        };
      }
    };

    const intelligenceEngine = {
      analyze(context) {
        return {
          ...context,
          intelligenceApplied: true
        };
      }
    };

    const ruleEngine = {
      apply(context) {
        return {
          ...context,
          rulesApplied: true
        };
      }
    };

    const apiGenerator = {
      generate(context) {
        return {
          generated: true,
          context
        };
      }
    };

    const pipeline =
      createGenerationPipeline({
        contextBuilder,
        intelligenceEngine,
        ruleEngine,
        apiGenerator
      });

    const result = await pipeline.execute({
      type: 'api',

      definition: {
        schema: 'public',
        table: 'example_table'
      }
    });

    expect(result.context).toMatchObject({
      schema: 'public',
      table: 'example_table',
      contextBuilt: true,
      intelligenceApplied: true,
      rulesApplied: true
    });

    expect(result.generation.generated).toBe(
      true
    );
  });
});