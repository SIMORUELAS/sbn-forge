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
  'SBN API v2 Manifest',
  () => {
    test(
      'genera un manifest válido',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile: 'sbn-api-v2'
          });

        try {
          const manifestPath =
            path.join(
              generated.moduleDirectory,
              'sbn-forge.manifest.json'
            );

          expect(
            await fs.pathExists(
              manifestPath
            )
          ).toBe(true);

          const manifest =
            await fs.readJson(
              manifestPath
            );

          console.log(
            JSON.stringify(
              manifest,
              null,
              2
            )
          );

          expect(
            manifest
          ).toBeDefined();
        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);