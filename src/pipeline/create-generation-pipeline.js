'use strict';

const {
  GenerationPipeline
} = require('./generation-pipeline');

const {
  GeneratorContextBuilder
} = require('../context');

const IntelligenceEngine = require(
  '../intelligence/intelligence-engine'
);

const RuleEngine = require(
  '../core/rule-engine'
);

const {
  generateApi
} = require(
  '../generators/backend/api-generator'
);

const RuntimeResourceContextBuilder =
  require(
    '../runtime/runtime-resource-context.builder'
  );

const RuntimeResourceGenerator =
  require(
    '../generators/runtime/runtime-resource.generator'
  );

/**
 * Crea el pipeline principal de generación.
 *
 * Flujo:
 *
 * definition / metadata
 *        ↓
 * GeneratorContextBuilder
 *        ↓
 * IntelligenceEngine
 *        ↓
 * RuleEngine
 *        ↓
 * ApiGenerator
 *
 * @param {object} options
 * @returns {GenerationPipeline}
 */
function createGenerationPipeline(
  options = {}
) {
  const generatorVersion =
    options.generatorVersion ||
    '0.1.0';

  const baseContextBuilder =
    options.contextBuilder ||
    new GeneratorContextBuilder();

  /*
   * Adaptador ligero.
   *
   * GenerationPipeline envía:
   *
   * build(builderInput, buildOptions)
   *
   * GeneratorContextBuilder recibe:
   *
   * build(input)
   *
   * Por eso se combinan ambos objetos antes
   * de llamar al builder definitivo.
   */
  const contextBuilder = {
    build(
      builderInput,
      buildOptions = {}
    ) {
      const profileName =
        buildOptions.profile ||
        builderInput.profile ||
        builderInput.generation
          ?.profile ||
        builderInput.options
          ?.profile ||
        'generic';

      const input = {
        ...builderInput,

        profile:
          profileName,

        generatorVersion,

        generation: {
          ...(builderInput.generation ||
            {}),

          ...(buildOptions.generation ||
            {}),

          profile:
            profileName
        },

        options: {
          ...(builderInput.options ||
            {}),

          ...buildOptions,

          profile:
            profileName,

          generatorVersion
        }
      };

      return baseContextBuilder.build(
        input
      );
    }
  };

  const intelligenceEngine =
    options.intelligenceEngine ||
    new IntelligenceEngine();

  const ruleEngine =
    options.ruleEngine ||
    new RuleEngine(
      options.rules || []
    );

  const apiGenerator =
    options.apiGenerator || {
      generate(
        context,
        generationOptions = {}
      ) {
        return generateApi(
          context,
          generationOptions
        );
      }
    };

  const runtimeContextBuilder =
    options.runtimeContextBuilder ||
    new RuntimeResourceContextBuilder();

  const runtimeResourceGenerator =
    options.runtimeResourceGenerator ||
    new RuntimeResourceGenerator();

  const runtimeGenerator = {
    async generate(
      context,
      generationOptions = {}
    ) {
      const runtimeContext =
        await runtimeContextBuilder.build(
          context
        );

      return runtimeResourceGenerator.generate(
        runtimeContext,
        generationOptions
      );
    }
  };

  return new GenerationPipeline({
    contextBuilder,

    intelligenceEngine,

    ruleEngine,

    generators: {
      api:
        apiGenerator,

      runtime:
        runtimeGenerator,

      ...(options.generators || {})
    }
  });
}

module.exports = {
  createGenerationPipeline
};