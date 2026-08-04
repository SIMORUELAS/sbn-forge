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
  'Utils Required Generator',
  () => {
    test(
      'genera los requisitos completos del módulo',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile:
              'sbn-api-v2'
          });

        try {
          const utilsPath =
            path.join(
              generated.moduleDirectory,
              'UTILS_REQUIRED.md'
            );

          expect(
            await fs.pathExists(
              utilsPath
            )
          ).toBe(
            true
          );

          const contents =
            await fs.readFile(
              utilsPath,
              'utf8'
            );

          expect(
            contents
          ).toContain(
            '# Module Requirements'
          );

          expect(
            contents
          ).toContain(
            'ai-business-model-installations'
          );

          expect(
            contents
          ).toContain(
            'simo_ai.ai_business_model_installations'
          );

          expect(
            contents
          ).toContain(
            'Paquetes de Node.js'
          );

          expect(
            contents
          ).toContain(
            'Variables de entorno'
          );

          expect(
            contents
          ).toContain(
            'ai_business_models'
          );

          expect(
            contents
          ).toContain(
            'public.users'
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
            'Colección Postman'
          );

          expect(
            contents
          ).toContain(
            'Orden recomendado de instalación'
          );
        }
        finally {
          await generated.cleanup();
        }
      }
    );
  }
);