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

    this.contextBuilder =
      contextBuilder;

    this.intelligenceEngine =
      intelligenceEngine;

    this.ruleEngine =
      ruleEngine;

    this.generators =
      generators;
  }

  async execute({
    type,
    definition,
    metadata,
    options = {}
  } = {}) {
    if (
      typeof type !== 'string' ||
      type.trim() === ''
    ) {
      throw new Error(
        'GenerationPipeline requiere el tipo de generador.'
      );
    }

    const generator =
      this.generators[type];

    if (
      !generator ||
      typeof generator.generate !== 'function'
    ) {
      throw new Error(
        `No existe un generador registrado para el tipo "${type}".`
      );
    }

    const builderInput =
      metadata || definition;

    if (!builderInput) {
      throw new Error(
        'GenerationPipeline requiere definition o metadata.'
      );
    }

    /*
     * Se envían las opciones al Context Builder.
     *
     * Aquí viajarán datos como:
     *
     * options.profile
     * options.generatorVersion
     * options.generation
     *
     * Los builders antiguos que solamente reciben un
     * argumento seguirán funcionando, porque JavaScript
     * ignora argumentos adicionales.
     */
    const baseContext =
      await this.contextBuilder.build(
        builderInput,
        {
          ...options,

          type,

          definition:
            definition || null,

          metadata:
            metadata || null
        }
      );

    if (
      !baseContext ||
      typeof baseContext !== 'object'
    ) {
      throw new Error(
        'El contextBuilder no produjo un contexto válido.'
      );
    }

    const intelligentContext =
      await this.intelligenceEngine.analyze(
        baseContext,
        {
          ...options,
          type
        }
      );

    if (
      !intelligentContext ||
      typeof intelligentContext !== 'object'
    ) {
      throw new Error(
        'El intelligenceEngine no produjo un contexto válido.'
      );
    }

    const finalContext =
      await this.ruleEngine.apply(
        intelligentContext,
        {
          ...options,
          type
        }
      );

    if (
      !finalContext ||
      typeof finalContext !== 'object'
    ) {
      throw new Error(
        'El ruleEngine no produjo un contexto válido.'
      );
    }

    const generationResult =
      await generator.generate(
        finalContext,
        options
      );

    return {
      context:
        finalContext,

      intelligence:
        finalContext.intelligence ||
        null,

      generation:
        generationResult
    };
  }
}

module.exports = {
  GenerationPipeline
};