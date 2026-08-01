'use strict';

const fs =
  require('fs-extra');

const path =
  require('path');

const definition =
  require(
    '../examples/ai_business_models.json'
  );

const {
  generateTestModule
} = require(
  './helpers/generate-test-module'
);

describe(
  'API Examples Generator',
  () => {
    test(
      'genera ejemplos completos del CRUD',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile:
              'sbn-api-v2'
          });

        try {
          const filePath =
            path.join(
              generated.moduleDirectory,
              'API_EXAMPLES.md'
            );

          expect(
            await fs.pathExists(
              filePath
            )
          ).toBe(true);

          const content =
            await fs.readFile(
              filePath,
              'utf8'
            );

          expect(
            content
          ).toContain(
            'Módulo: **ai-business-models**'
          );

          expect(
            content
          ).toContain(
            'GET http://localhost:3500/ia/ai-business-models'
          );

          expect(
            content
          ).toContain(
            'POST http://localhost:3500/ia/ai-business-models'
          );

          expect(
            content
          ).toContain(
            'PATCH http://localhost:3500/ia/ai-business-models/'
          );

          expect(
            content
          ).toContain(
            'DELETE http://localhost:3500/ia/ai-business-models/'
          );

          expect(
            content
          ).toContain(
            '"code": "SBN-EXAMPLE"'
          );

          expect(
            content
          ).toContain(
            '"name": "Registro de ejemplo"'
          );

          expect(
            content
          ).toContain(
            '"expected_version_no": 1'
          );

          expect(
            content
          ).toContain(
            'Este módulo utiliza **Soft Delete**.'
          );

          expect(
            content
          ).toContain(
            'AI_BUSINESS_MODELS_VIEW'
          );
        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);