'use strict';

const RuntimeResourceContextBuilder =
  require(
    '../src/runtime/runtime-resource-context.builder'
  );

describe(
  'RuntimeResourceContextBuilder',
  () => {
    test(
      'builds a basic ForgeRuntime ResourceDefinition context',
      () => {
        const builder =
          new RuntimeResourceContextBuilder();

        const generatorContext = {
          database: {
            schema:
              'simo_ai',

            table:
              'ai_intelligent_departments'
          },

          names: {
            table:
              'ai_intelligent_departments',

            module:
              'ai-intelligent-departments',

            entity:
              'AiIntelligentDepartments',

            variable:
              'aiIntelligentDepartments',

            route:
              'ai-intelligent-departments',

            permissionPrefix:
              'AI_INTELLIGENT_DEPARTMENTS'
          },

          columns: [
            {
              name:
                'id',

              type:
                'uuid',

              nullable:
                false,

              writable:
                false,

              primaryKey:
                true
            },

            {
              name:
                'code',

              type:
                'varchar',

              nullable:
                false,

              writable:
                true
            },

            {
              name:
                'name',

              type:
                'varchar',

              nullable:
                false,

              writable:
                true
            },

            {
              name:
                'description',

              type:
                'text',

              nullable:
                true,

              writable:
                true
            }
          ],

          primaryKey: {
            name:
              'ai_intelligent_departments_pkey',

            columns: [
              'id'
            ]
          },

          primaryKeyColumn: {
            name:
              'id',

            type:
              'uuid'
          },

          foreignKeys: [],

          capabilities: {
            crud:
              true,

            optimisticLock:
              false
          },

          api: {
            basePath:
              '/ia/ai-intelligent-departments'
          }
        };

        const result =
          builder.build(
            generatorContext
          );

        expect(
          result.name
        ).toBe(
          'ai-intelligent-departments'
        );

        expect(
          result.code
        ).toBe(
          'AI_INTELLIGENT_DEPARTMENTS'
        );

        expect(
          result.primaryKey
        ).toBe(
          'id'
        );

        expect(
          result.defaultTheme
        ).toBe(
          'sbn-futuristic'
        );

        expect(
          result.fields
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name:
                'id',

              type:
                'uuid',

              readonly:
                true
            }),

            expect.objectContaining({
              name:
                'code',

              type:
                'text',

              required:
                true
            }),

            expect.objectContaining({
              name:
                'name',

              type:
                'text',

              required:
                true
            }),

            expect.objectContaining({
              name:
                'description',

              type:
                'textarea'
            })
          ])
        );

        expect(
          result.api
        ).toEqual({
          list: {
            path:
              '/ia/ai-intelligent-departments',

            method:
              'GET'
          },

          getById: {
            path:
              '/ia/ai-intelligent-departments/:id',

            method:
              'GET'
          },

          create: {
            path:
              '/ia/ai-intelligent-departments',

            method:
              'POST'
          },

          update: {
            path:
              '/ia/ai-intelligent-departments/:id',

            method:
              'PATCH'
          },

          delete: {
            path:
              '/ia/ai-intelligent-departments/:id',

            method:
              'DELETE'
          }
        });

        expect(
          result.views
        ).toEqual([
          {
            type:
              'list'
          },

          {
            type:
              'form'
          },

          {
            type:
              'detail'
          }
        ]);
      }
    );

    test(
      'maps PostgreSQL field types, defaults and readonly fields',
      () => {
        const builder =
          new RuntimeResourceContextBuilder();

        const generatorContext = {
          names: {
            module:
              'ai-intelligent-departments',

            permissionPrefix:
              'AI_INTELLIGENT_DEPARTMENTS'
          },

          columns: [
            {
              name:
                'id',

              type:
                'uuid',

              nullable:
                false,

              writable:
                false,

              primaryKey:
                true,

              hasDefaultValue:
                true
            },

            {
              name:
                'status',

              type:
                'varchar',

              nullable:
                false,

              writable:
                true,

              hasDefaultValue:
                true,

              defaultValue:
                'active'
            },

            {
              name:
                'configuration_json',

              type:
                'jsonb',

              nullable:
                true,

              writable:
                true,

              hasDefaultValue:
                false
            },

            {
              name:
                'created_at',

              type:
                'timestamp',

              nullable:
                false,

              writable:
                false,

              hasDefaultValue:
                true,

              defaultValue:
                'CURRENT_TIMESTAMP'
            },

            {
              name:
                'created_by',

              type:
                'bigint',

              nullable:
                true,

              writable:
                false,

              hasDefaultValue:
                false
            },

            {
              name:
                'version_no',

              type:
                'integer',

              nullable:
                false,

              writable:
                false,

              hasDefaultValue:
                true,

              defaultValue:
                1
            }
          ],

          primaryKey: {
            columns: [
              'id'
            ]
          },

          foreignKeys: [],

          capabilities: {
            crud:
              true
          },

          api: {
            basePath:
              '/ia/ai-intelligent-departments'
          }
        };

        const result =
          builder.build(
            generatorContext
          );

        const fields =
          Object.fromEntries(
            result.fields.map(
              field => [
                field.name,
                field
              ]
            )
          );

        expect(
          fields.id
        ).toEqual(
          expect.objectContaining({
            type:
              'uuid',

            readonly:
              true
          })
        );

        expect(
          fields.status
        ).toEqual(
          expect.objectContaining({
            type:
              'text',

            defaultValue:
              'active'
          })
        );

        expect(
          fields.status.required
        ).toBeUndefined();

        expect(
          fields.configuration_json
        ).toEqual(
          expect.objectContaining({
            type:
              'json'
          })
        );

        expect(
          fields.created_at
        ).toEqual(
          expect.objectContaining({
            type:
              'datetime',

            readonly:
              true
          })
        );

        expect(
          fields.created_by
        ).toEqual(
          expect.objectContaining({
            type:
              'number',

            readonly:
              true
          })
        );

        expect(
          fields.version_no
        ).toEqual(
          expect.objectContaining({
            type:
              'number',

            readonly:
              true,

            defaultValue:
              1
          })
        );
      }
    );

    test(
      'maps foreign keys to ForgeRuntime lookup fields',
      () => {
        const builder =
          new RuntimeResourceContextBuilder();

        const generatorContext = {
          names: {
            module:
              'ai-business-model-departments',

            permissionPrefix:
              'AI_BUSINESS_MODEL_DEPARTMENTS'
          },

          columns: [
            {
              name:
                'id',

              type:
                'bigint',

              nullable:
                false,

              writable:
                false,

              primaryKey:
                true
            },

            {
              name:
                'business_model_id',

              type:
                'uuid',

              nullable:
                false,

              writable:
                true
            },

            {
              name:
                'department_id',

              type:
                'uuid',

              nullable:
                false,

              writable:
                true
            }
          ],

          primaryKey: {
            columns: [
              'id'
            ]
          },

          foreignKeys: [
            {
              name:
                'fk_business_model_department_department',

              column:
                'department_id',

              referencedSchema:
                'simo_ai',

              referencedTable:
                'ai_intelligent_departments',

              referencedColumn:
                'id'
            }
          ],

          capabilities: {
            crud:
              true
          },

          api: {
            basePath:
              '/ia/ai-business-model-departments'
          }
        };

        const result =
          builder.build(
            generatorContext
          );

        const departmentField =
          result.fields.find(
            field =>
              field.name ===
                'department_id'
          );

        expect(
          departmentField
        ).toEqual(
          expect.objectContaining({
            name:
              'department_id',

            type:
              'lookup',

            required:
              true,

            lookupResource:
              'ai-intelligent-departments'
          })
        );
      }
    );

    test(
      'maps optimistic locking to ForgeRuntime metadata',
      () => {
        const builder =
          new RuntimeResourceContextBuilder();

        const generatorContext = {
          names: {
            module:
              'ai-business-model-departments',

            permissionPrefix:
              'AI_BUSINESS_MODEL_DEPARTMENTS'
          },

          columns: [
            {
              name:
                'id',

              type:
                'bigint',

              nullable:
                false,

              writable:
                false
            },

            {
              name:
                'name',

              type:
                'varchar',

              nullable:
                false,

              writable:
                true
            },

            {
              name:
                'version_no',

              type:
                'integer',

              nullable:
                false,

              writable:
                false,

              hasDefaultValue:
                true,

              defaultValue:
                1
            }
          ],

          primaryKey: {
            columns: [
              'id'
            ]
          },

          foreignKeys: [],

          capabilities: {
            crud:
              true,

            optimisticLock:
              true
          },

          api: {
            basePath:
              '/ia/ai-business-model-departments'
          }
        };

        const result =
          builder.build(
            generatorContext
          );

        expect(
          result.optimisticLock
        ).toEqual({
          versionField:
            'version_no',

          expectedField:
            'expected_version_no'
        });

        expect(
          result.fields.find(
            field =>
              field.name ===
                'version_no'
          )
        ).toEqual(
          expect.objectContaining({
            type:
              'number',

            readonly:
              true,

            defaultValue:
              1
          })
        );
      }
    );
  }
);
