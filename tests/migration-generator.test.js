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
  'PostgreSQL Migration Generator',
  () => {
    test(
      'genera identity, defaults y foreign keys',
      async () => {
        const generated =
          await generateTestModule({
            definition
          });

        try {
          const migrationPath =
            path.join(
              generated.moduleDirectory,
              'database',
              'migrations',
              'ai-business-model-teams.migration.sql'
            );

          expect(
            await fs.pathExists(
              migrationPath
            )
          ).toBe(true);

          const migration =
            await fs.readFile(
              migrationPath,
              'utf8'
            );

          expect(
            migration
          ).toContain(
            'id bigint GENERATED ALWAYS AS IDENTITY NOT NULL PRIMARY KEY'
          );

          expect(
            migration
          ).toContain(
            'is_required boolean NOT NULL DEFAULT true'
          );

          expect(
            migration
          ).toContain(
            'execution_order integer NOT NULL DEFAULT 1'
          );

          expect(
            migration
          ).toContain(
            'created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP'
          );

          expect(
            migration
          ).toContain(
            'version_no integer NOT NULL DEFAULT 1'
          );

          expect(
            migration
          ).toContain(
            'FOREIGN KEY (business_model_id)'
          );

          expect(
            migration
          ).toContain(
            'REFERENCES simo_ai.ai_business_models'
          );

          expect(
            migration
          ).toContain(
            'FOREIGN KEY (team_id)'
          );

          expect(
            migration
          ).toContain(
            'REFERENCES simo_ai.ai_business_teams'
          );
        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);