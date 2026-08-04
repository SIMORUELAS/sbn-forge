'use strict';

const fs = require('fs-extra');
const path = require('path');

const definition = require(
  '../examples/ai_business_model_teams.json'
);

const {
  generateTestModule
} = require(
  './helpers/generate-test-module'
);

describe(
  'SBN API v2 Profile',
  () => {
    test(
      'genera todos los artefactos esperados',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile:
              'sbn-api-v2'
          });

        try {
          const moduleDirectory =
            generated.moduleDirectory;

          const expectedPaths = [
            'ai-business-model-teams.routes.js',
            'ai-business-model-teams.controller.js',
            'ai-business-model-teams.service.js',
            'ai-business-model-teams.repository.js',
            'ai-business-model-teams.schema.js',
            'README.md',
            'API_EXAMPLES.md',
            'DATA_DICTIONARY.md',
            'UTILS_REQUIRED.md',
            'MODULE_INSTALLATION.md',
            'ai-business-model-teams.postman_collection.json',
            'sbn-forge.manifest.json',

            path.join(
              'database',
              'migrations',
              'ai-business-model-teams.migration.sql'
            ),

            path.join(
              'database',
              'seeds',
              'ai-business-model-teams.seeds.sql'
            ),

            path.join(
              'tests',
              'ai-business-model-teams.http'
            )
          ];

          for (
            const relativePath of
              expectedPaths
          ) {
            const absolutePath =
              path.join(
                moduleDirectory,
                relativePath
              );

            expect(
              await fs.pathExists(
                absolutePath
              )
            ).toBe(
              true
            );
          }
        }
        finally {
          await generated.cleanup();
        }
      }
    );
  }
);