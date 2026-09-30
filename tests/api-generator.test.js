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
            './ai-business-model-departments.repository'
          );

          expect(
            routes
          ).toContain(
            'options.databaseDecorator'
          );

          expect(
            routes
          ).toContain(
            'fastify[databaseDecorator]'
          );

          expect(
            routes
          ).toContain(
            'repository.configure('
          );

          expect(
            routes
          ).toContain(
            'fastify.get('
          );

          expect(
            routes
          ).toContain(
            'controller.list'
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

  test(
    'genera idParam integer para primary key bigint',
    async () => {
      const output =
        await fs.mkdtemp(
          path.join(
            os.tmpdir(),
            'forge-pk-bigint-'
          )
        );

      try {
        const context =
          createGeneratorContext(
            definition
          );

        const result =
          await generateApi(
            context,
            {
              output
            }
          );

        const schemaPath =
          path.join(
            result.moduleDirectory,
            'ai-business-model-departments.schema.js'
          );

        const schema =
          await fs.readFile(
            schemaPath,
            'utf8'
          );

        const idParamBlock =
          schema.match(
            /const idParam = \{[\s\S]*?\n\};/
          )?.[0];

        expect(
          idParamBlock
        ).toBeDefined();

        expect(
          idParamBlock
        ).toContain(
          "type: 'integer'"
        );

        expect(
          idParamBlock
        ).not.toContain(
          "format: 'uuid'"
        );
      } finally {
        await fs.remove(
          output
        );
      }
    }
  );

  test(
    'genera idParam uuid para primary key uuid',
    async () => {
      const output =
        await fs.mkdtemp(
          path.join(
            os.tmpdir(),
            'forge-pk-uuid-'
          )
        );

      const uuidDefinition = {
        ...definition,

        table:
          'ai_business_model_departments_uuid_test',

        columns:
          definition.columns.map(
            (column) =>
              column.name === 'id'
                ? {
                    ...column,
                    type: 'uuid',
                    generated: false,
                    writable: false,
                    precision: undefined,
                    scale: undefined
                  }
                : {
                    ...column
                  }
          )
      };

      try {
        const context =
          createGeneratorContext(
            uuidDefinition
          );

        const result =
          await generateApi(
            context,
            {
              output
            }
          );

        const schemaPath =
          path.join(
            result.moduleDirectory,
            'ai-business-model-departments-uuid-test.schema.js'
          );

        const schema =
          await fs.readFile(
            schemaPath,
            'utf8'
          );

        const idParamBlock =
          schema.match(
            /const idParam = \{[\s\S]*?\n\};/
          )?.[0];

        expect(
          idParamBlock
        ).toBeDefined();

        expect(
          idParamBlock
        ).toContain(
          "type: 'string'"
        );

        expect(
          idParamBlock
        ).toContain(
          "format: 'uuid'"
        );
      } finally {
        await fs.remove(
          output
        );
      }
    }
  );
});
