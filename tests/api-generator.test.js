'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const definition = require(
  '../examples/ai_business_model_departments.json'
);

const {
  createGeneratorContext
} = require(
  '../src/core/generator-context'
);

const {
  generateApi
} = require(
  '../src/generators/backend/api-generator'
);

describe('API Generator', () => {
  test(
    'genera módulo, README y manifest',
    async () => {
      const output =
        await fs.mkdtemp(
          path.join(
            os.tmpdir(),
            'forge-'
          )
        );

      try {
        const context =
          createGeneratorContext(
            definition,
            {
              generatedAt:
                '2026-07-18T00:00:00.000Z'
            }
          );

        const result =
          await generateApi(
            context,
            {
              output
            }
          );

        expect(
          result.files
        ).toHaveLength(7);

        const routesPath =
          path.join(
            result.moduleDirectory,
            'ai-business-model-departments.routes.js'
          );

        const routes =
          await fs.readFile(
            routesPath,
            'utf8'
          );

        expect(
          routes
        ).toContain(
          'fastify.get(base'
        );

        expect(
          await fs.pathExists(
            result.manifestPath
          )
        ).toBe(true);

        const manifest =
          await fs.readJson(
            result.manifestPath
          );

        expect(
          manifest.module.table
        ).toBe(
          'ai_business_model_departments'
        );

        expect(
          manifest.capabilities.softDelete
        ).toBe(true);
      } finally {
        await fs.remove(output);
      }
    }
  );

  test(
    'dry-run devuelve plan sin crear salida',
    async () => {
      const output =
        path.join(
          os.tmpdir(),
          `forge-dry-${Date.now()}`
        );

      const context =
        createGeneratorContext(
          definition
        );

      const result =
        await generateApi(
          context,
          {
            output,
            dryRun: true
          }
        );

      expect(
        result.files
      ).toHaveLength(7);

      expect(
        await fs.pathExists(output)
      ).toBe(false);
    }
  );
});