'use strict';

const fs = require('fs-extra');
const path = require('path');

const definition = require(
  '../examples/ai_business_models.json'
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
      'genera INSERTs desde los seeds de la definición',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile:
              'sbn-api-v2'
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
            files
          ).toContain(
            'ai-business-models.seeds.sql'
          );

          const seedPath =
            path.join(
              seedsDirectory,
              'ai-business-models.seeds.sql'
            );

          expect(
            await fs.pathExists(
              seedPath
            )
          ).toBe(true);

          const seed =
            await fs.readFile(
              seedPath,
              'utf8'
            );

          expect(
            seed
          ).toContain(
            '-- SBN Forge seeds'
          );

          expect(
            seed
          ).toContain(
            '-- Schema: simo_ai'
          );

          expect(
            seed
          ).toContain(
            '-- Table: ai_business_models'
          );

          expect(
            seed
          ).toContain(
            'INSERT INTO simo_ai.ai_business_models'
          );

          expect(
            seed
          ).toContain(
            'SBN-SMART-COLLECTIONS'
          );

          expect(
            seed
          ).toContain(
            "'SBN Smart Collections'"
          );

          expect(
            seed
          ).toContain(
            "'Modelo empresarial para automatización de cobranza.'"
          );

          expect(
            seed
          ).toContain(
            "'Servicios empresariales'"
          );

          expect(
            seed
          ).toContain(
            "'SaaS'"
          );

          expect(
            seed
          ).toContain(
            "'active'"
          );

          expect(
            seed
          ).toContain(
            "'development'"
          );

          expect(
            seed
          ).toContain(
            '\'{"collections":true,"forecast":true}\'::jsonb'
          );

          expect(
            seed
          ).toContain(
            '\'{"source":"sbn-forge"}\'::jsonb'
          );

          expect(
            seed
          ).toContain(
            "'global_template'"
          );

          expect(
            seed
          ).toContain(
            'true'
          );

          expect(
            seed
          ).toContain(
            "'manual_approval'"
          );

          expect(
            seed
          ).toContain(
            "'1.0.0'"
          );

          expect(
            seed
          ).not.toContain(
            '-- TODO:'
          );
        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);