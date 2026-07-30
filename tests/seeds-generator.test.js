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
  'PostgreSQL Seeds Generator',
  () => {
    test(
      'genera el archivo de seeds',
      async () => {
        const generated =
          await generateTestModule({
            definition
          });

        try {
          const seedsDirectory =
            path.join(
              generated.moduleDirectory,
              'database',
              'seeds'
            );

          expect(
            await fs.pathExists(
              seedsDirectory
            )
          ).toBe(true);

          const files =
            await fs.readdir(
              seedsDirectory
            );

          expect(
            files.length
          ).toBeGreaterThan(0);

          expect(
            files.some(
              file =>
                file.endsWith('.sql')
            )
          ).toBe(true);

          

            const seedFile =
            files.find(
                file =>
                file.endsWith('.sql')
            );

            const seedPath =
            path.join(
                seedsDirectory,
                seedFile
            );

            const seed =
            await fs.readFile(
                seedPath,
                'utf8'
            );

            expect(seed).toContain(
              '-- SBN Forge seeds'
            );

            expect(seed).toContain(
              '-- Schema: simo_ai'
            );

            expect(seed).toContain(
              '-- Table: ai_business_model_teams'
            );

            expect(seed).toContain(
              '-- TODO: definir datos iniciales para simo_ai.ai_business_model_teams'
            );

            expect(seed).toContain(
            '-- SBN Forge seeds'
            );

            expect(seed).toContain(
            '-- Schema: simo_ai'
            );

            expect(seed).toContain(
            '-- Table: ai_business_model_teams'
            );

            expect(seed).toContain(
            '-- TODO: definir datos iniciales'
            );


        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);