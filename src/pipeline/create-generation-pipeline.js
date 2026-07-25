'use strict';

const {
  GenerationPipeline
} = require('./generation-pipeline');

const {
  createGeneratorContext
} = require('../core/generator-context');

const IntelligenceEngine = require(
  '../intelligence/intelligence-engine'
);

const RuleEngine = require(
  '../core/rule-engine'
);

const {
  generateApi
} = require('../generators/backend/api-generator');

/**
 * Crea el pipeline principal de generación.
 *
 * La versión 0.1.0 utiliza un adaptador para conservar
 * compatibilidad con createGeneratorContext(), debido a
 * que ApiGenerator todavía consume el contexto original.
 *
 * @param {object} options
 * @returns {GenerationPipeline}
 */
function createGenerationPipeline(options = {}) {
  const generatorVersion =
    options.generatorVersion || '0.1.0';

  const contextBuilder =
    options.contextBuilder || {
      build(definition) {
        return createGeneratorContext(
          definition,
          {
            generatorVersion
          }
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
      generate(context, generationOptions = {}) {
        return generateApi(
          context,
          generationOptions
        );
      }
    };

  return new GenerationPipeline({
    contextBuilder,
    intelligenceEngine,
    ruleEngine,

    generators: {
      api: apiGenerator,
      ...(options.generators || {})
    }
  });
}

module.exports = {
  createGenerationPipeline
};