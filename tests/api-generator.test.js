'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const definition = require(
  '../examples/ai_business_model_departments.json'
);

const aiAgentsDefinition = require(
  '../examples/ai_agents.json'
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
  test('aplica limites SMALLINT a llave primaria simple sin duplicar propiedades', async () => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-smallint-pk-'));
    try {
      const sample = {
        ...definition,
        table: 'forge_smallint_pk_contract',
        columns: definition.columns.map(column =>
          column.name === 'id'
            ? { ...column, type: 'smallint', generated: false }
            : { ...column }
        )
      };
      const result = await generateApi(createGeneratorContext(sample), { output });
      const schema = require(path.join(result.moduleDirectory, 'forge-smallint-pk-contract.schema.js'));
      expect(schema.getById.params.properties.id).toEqual({
        type: 'integer', minimum: -32768, maximum: 32767
      });
      const text = await fs.readFile(path.join(result.moduleDirectory, 'forge-smallint-pk-contract.schema.js'), 'utf8');
      expect(text).not.toMatch(/minimum: -32768,[\\s\\S]*?minimum: -32768/);
    } finally {
      await fs.remove(output);
    }
  });

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
  test(
    'genera uuid nullable y optimistic locking para ai_agents',
    async () => {
      const output =
        await fs.mkdtemp(
          path.join(
            os.tmpdir(),
            'forge-ai-agents-nullable-'
          )
        );

      try {
        const context =
          createGeneratorContext(
            aiAgentsDefinition
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
            'ai-agents.schema.js'
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

        const branchIdBlock =
          schema.match(
            /branch_id: \{[\s\S]*?\n  \}/
          )?.[0];

        expect(
          branchIdBlock
        ).toBeDefined();

        expect(
          branchIdBlock
        ).toContain(
          "type: 'string'"
        );

        expect(
          branchIdBlock
        ).toContain(
          "format: 'uuid'"
        );

        expect(
          branchIdBlock
        ).toContain(
          "nullable: true"
        );

        const repositoryPath =
          path.join(
            result.moduleDirectory,
            'ai-agents.repository.js'
          );

        const repository =
          await fs.readFile(
            repositoryPath,
            'utf8'
          );

        expect(
          repository
        ).toContain(
          'input.expected_version_no'
        );

        expect(
          repository
        ).toContain(
          'const expectedVersion ='
        );

        expect(
          repository
        ).toContain(
          'data.version_no ='
        );

        expect(
          repository
        ).toContain(
          'expectedVersion + 1'
        );

        expect(
          repository
        ).toContain(
          'AND version_no = $${values.length}'
        );

        expect(
          repository
        ).toContain(
          'version_no = version_no + 1'
        );

      } finally {
        await fs.remove(
          output
        );
      }
    }
  );
});
