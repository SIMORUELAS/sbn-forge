'use strict';

const fs =
  require(
    'fs-extra'
  );

const path =
  require(
    'path'
  );

const definition =
  require(
    '../examples/ai_business_model_installations.json'
  );

const {
  generateTestModule
} = require(
  './helpers/generate-test-module'
);

describe(
  'Module Installation Generator',
  () => {
    test(
      'genera la guía de instalación del módulo',
      async () => {
        const generated =
          await generateTestModule({
            definition,

            profile:
              'sbn-api-v2',

            framework:
              'fastify',

            moduleRoot:
              'modules_ia',

            apiPrefix:
              '/api',

            routePrefix:
              '/ia'
          });

        try {
          const installationPath =
            path.join(
              generated.moduleDirectory,
              'MODULE_INSTALLATION.md'
            );

          expect(
            await fs.pathExists(
              installationPath
            )
          ).toBe(
            true
          );

          const contents =
            await fs.readFile(
              installationPath,
              'utf8'
            );

          expect(
            contents
          ).toContain(
            '# Instalación del módulo'
          );

          expect(
            contents
          ).toContain(
            'ai-business-model-installations'
          );

          expect(
            contents
          ).toContain(
            'const aiBusinessModelInstallations'
          );

          expect(
            contents
          ).toContain(
            './modules_ia/' +
            'ai-business-model-installations/' +
            'ai-business-model-installations.routes'
          );

          expect(
            contents
          ).not.toContain(
            './modules_ia/' +
            'ai_business_model_installations/' +
            'ai_business_model_installations.routes'
          );

          expect(
            contents
          ).toContain(
            'await fastify.register'
          );

          expect(
            contents
          ).toContain(
            "prefix: '/api'"
          );

          expect(
            contents
          ).toContain(
            '/api/ia/' +
            'ai-business-model-installations'
          );

          expect(
            contents
          ).toContain(
            'database/migrations/'
          );

          expect(
            contents
          ).toContain(
            'database/seeds/'
          );

          expect(
            contents
          ).toContain(
            'postman_collection.json'
          );

          expect(
            contents
          ).toContain(
            'Lista de verificación'
          );
        }
        finally {
          await generated.cleanup();
        }
      }
    );
  }
);