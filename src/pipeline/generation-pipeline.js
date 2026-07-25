'use strict';

class GenerationPipeline {
  constructor({
    contextBuilder,
    intelligenceEngine,
    ruleEngine,
    generators
  } = {}) {
    if (
      !contextBuilder ||
      typeof contextBuilder.build !== 'function'
    ) {
      throw new Error(
        'GenerationPipeline requiere un contextBuilder con build().'
      );
    }

    if (
      !intelligenceEngine ||
      typeof intelligenceEngine.analyze !== 'function'
    ) {
      throw new Error(
        'GenerationPipeline requiere un intelligenceEngine con analyze().'
      );
    }

    if (
      !ruleEngine ||
      typeof ruleEngine.apply !== 'function'
    ) {
      throw new Error(
        'GenerationPipeline requiere un ruleEngine con apply().'
      );
    }

    if (
      !generators ||
      typeof generators !== 'object' ||
      Array.isArray(generators)
    ) {
      throw new Error(
        'GenerationPipeline requiere un catálogo de generators.'
      );
    }

    this.contextBuilder = contextBuilder;
    this.intelligenceEngine = intelligenceEngine;
    this.ruleEngine = ruleEngine;
    this.generators = generators;
  }

  async execute({
    type,
    definition,
    metadata,
    options = {}
  } = {}) {
    if (!type) {
      throw new Error(
        'GenerationPipeline requiere el tipo de generador.'
      );
    }

    const generator = this.generators[type];

    if (
      !generator ||
      typeof generator.generate !== 'function'
    ) {
      throw new Error(
        `No existe un generador registrado para el tipo "${type}".`
      );
    }

    const builderInput = metadata || definition;

    if (!builderInput) {
      throw new Error(
        'GenerationPipeline requiere definition o metadata.'
      );
    }

    const baseContext = await this.contextBuilder.build(
      builderInput
    );

    const intelligentContext =
      await this.intelligenceEngine.analyze(
        baseContext
      );

    const finalContext = await this.ruleEngine.apply(
      intelligentContext
    );

    const generationResult = await generator.generate(
      finalContext,
      options
    );

    return {
      context: finalContext,
      intelligence:
        finalContext.intelligence || null,
      generation: generationResult
    };
  }
}

module.exports = {
  GenerationPipeline
};