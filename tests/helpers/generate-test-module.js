'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const {
  createGenerationPipeline
} = require(
  '../../src/pipeline/create-generation-pipeline'
);

/**
 * Genera un módulo de prueba usando una carpeta temporal.
 *
 * La función devuelve:
 *
 * - output: carpeta temporal
 * - result: resultado completo del pipeline
 * - moduleDirectory: carpeta del módulo generado
 * - cleanup(): elimina la carpeta temporal
 */
async function generateTestModule({
  definition,
  profile = 'sbn-api-v2',
  type = 'api',
  force = true
} = {}) {
  if (!definition) {
    throw new Error(
      'generateTestModule requiere una definition.'
    );
  }

  const output =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'sbn-forge-test-'
      )
    );

  try {
    const pipeline =
      createGenerationPipeline();

    const result =
      await pipeline.execute({
        type,

        definition,

        options: {
          profile,
          output,
          force
        }
      });

    return {
      output,

      result,

      moduleDirectory:
        result.generation.moduleDirectory,

      async cleanup() {
        await fs.remove(output);
      }
    };
  } catch (error) {
    await fs.remove(output);

    throw error;
  }
}

module.exports = {
  generateTestModule
};