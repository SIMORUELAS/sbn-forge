'use strict';

const GeneratorContextBuilder =
  require(
    '../src/context/generator-context.builder'
  );

describe(
  'GeneratorContextBuilder',
  () => {
    test(
      'construye el modelo interno de Forge',
      () => {
        const builder =
          new GeneratorContextBuilder();

        const context =
          builder.build({
            source: {
              type:
                'postgresql'
            },

            schema:
              'simo_ai',

            table:
              'ai_business_model_departments',

            profile:
              'sbn-api-v2',

            columns: [
              {
                position:
                  1,

                name:
                  'id',

                dataType:
                  'bigint',

                nativeType:
                  'int8',

                nullable:
                  false,

                generated:
                  true
              },

              {
                position:
                  2,

                name:
                  'business_model_id',

                dataType:
                  'uuid',

                nativeType:
                  'uuid',

                nullable:
                  false
              },

              {
                position:
                  3,

                name:
                  'configuration_json',

                dataType:
                  'jsonb',

                nativeType:
                  'jsonb',

                nullable:
                  true,

                defaultValue:
                  null
              },

              {
                position:
                  4,

                name:
                  'deleted_at',

                dataType:
                  'timestamp',

                nativeType:
                  'timestamp',

                nullable:
                  true
              },

              {
                position:
                  5,

                name:
                  'version_no',

                dataType:
                  'integer',

                nativeType:
                  'int4',

                nullable:
                  false,

                defaultValue:
                  1
              }
            ],

            primaryKey: {
              name:
                'pk_departments',

              columns: [
                'id'
              ]
            },

            foreignKeys: [
              {
                name:
                  'fk_business_model',

                column:
                  'business_model_id',

                referencedSchema:
                  'simo_ai',

                referencedTable:
                  'ai_business_models',

                referencedColumn:
                  'id'
              }
            ]
          });

        // ---------------------------------------------------------------------
        // Información general del contexto
        // ---------------------------------------------------------------------

        expect(
          context.forge.contextVersion
        ).toBe(
          '1.0.0'
        );

        expect(
          context.source.type
        ).toBe(
          'postgresql'
        );

        expect(
          context.database
        ).toEqual({
          schema:
            'simo_ai',

          table:
            'ai_business_model_departments'
        });

        // ---------------------------------------------------------------------
        // Perfil
        // ---------------------------------------------------------------------

        expect(
          context.profile.name
        ).toBe(
          'sbn-api-v2'
        );

        expect(
          context.profile.standard
        ).toBe(
          'SBN API v2'
        );

        expect(
          context.generation.files
            .postmanCollection
        ).toBe(
          true
        );

        // ---------------------------------------------------------------------
        // Convenciones de nombres
        // ---------------------------------------------------------------------

        expect(
          context.names.module
        ).toBe(
          'ai-business-model-departments'
        );

        expect(
          context.names.entity
        ).toBe(
          'AiBusinessModelDepartments'
        );

        expect(
          context.names.variable
        ).toBe(
          'aiBusinessModelDepartments'
        );

        expect(
          context.names.route
        ).toBe(
          'ai-business-model-departments'
        );

        expect(
          context.names.permissionPrefix
        ).toBe(
          'AI_BUSINESS_MODEL_DEPARTMENTS'
        );

        // ---------------------------------------------------------------------
        // Capacidades detectadas
        // ---------------------------------------------------------------------

        expect(
          context.capabilities.softDelete
        ).toBe(
          true
        );

        expect(
          context.capabilities.optimisticLock
        ).toBe(
          true
        );

        expect(
          context.capabilities.jsonColumns
        ).toEqual([
          'configuration_json'
        ]);

        expect(
          context.capabilities.foreignKeys
        ).toBe(
          true
        );

        expect(
          context.capabilities.hasPrimaryKey
        ).toBe(
          true
        );

        // ---------------------------------------------------------------------
        // Columnas normalizadas
        // ---------------------------------------------------------------------

        expect(
          context.columns
        ).toHaveLength(
          5
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'id'
          ).generated
        ).toBe(
          true
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'id'
          ).identity
        ).toBe(
          true
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'id'
          ).writable
        ).toBe(
          false
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'business_model_id'
          ).writable
        ).toBe(
          true
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'configuration_json'
          ).writable
        ).toBe(
          true
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'configuration_json'
          ).hasDefaultValue
        ).toBe(
          false
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'deleted_at'
          ).writable
        ).toBe(
          false
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'version_no'
          ).writable
        ).toBe(
          false
        );

        expect(
          context.columns.find(
            column =>
              column.name ===
              'version_no'
          ).hasDefaultValue
        ).toBe(
          true
        );

        expect(
          context.columns.every(
            column =>
              column.jsonSchema
          )
        ).toBe(
          true
        );

        expect(
          context.columns.every(
            column =>
              typeof column
                .jsonSchemaText ===
              'string'
          )
        ).toBe(
          true
        );

        // ---------------------------------------------------------------------
        // Columnas escribibles
        // ---------------------------------------------------------------------

        expect(
          context.writableColumns.map(
            column =>
              column.name
          )
        ).toEqual([
          'business_model_id',
          'configuration_json'
        ]);

        expect(
          context.writableColumns
        ).toHaveLength(
          2
        );

        expect(
          context.requiredWritableColumns.map(
            column =>
              column.name
          )
        ).toEqual([
          'business_model_id'
        ]);

        expect(
          context.createRequiredColumns
        ).toEqual(
          context.requiredWritableColumns
        );

        // ---------------------------------------------------------------------
        // Mapa de columnas
        // ---------------------------------------------------------------------

        expect(
          Object.keys(
            context.columnMap
          )
        ).toHaveLength(
          5
        );

        expect(
          context.columnMap.id.identity
        ).toBe(
          true
        );

        expect(
          context.columnMap.id.writable
        ).toBe(
          false
        );

        expect(
          context.columnMap
            .business_model_id
            .name
        ).toBe(
          'business_model_id'
        );

        expect(
          context.columnMap
            .configuration_json
            .name
        ).toBe(
          'configuration_json'
        );

        expect(
          context.columnMap
            .deleted_at
            .writable
        ).toBe(
          false
        );

        expect(
          context.columnMap
            .version_no
            .writable
        ).toBe(
          false
        );

        // ---------------------------------------------------------------------
        // Llave primaria
        // ---------------------------------------------------------------------

        expect(
          context.primaryKey
        ).toEqual({
          name:
            'pk_departments',

          columns: [
            'id'
          ]
        });

        // ---------------------------------------------------------------------
        // Llaves foráneas
        // ---------------------------------------------------------------------

        expect(
          context.foreignKeys
        ).toHaveLength(
          1
        );

        expect(
          context.foreignKeys[0].name
        ).toBe(
          'fk_business_model'
        );

        expect(
          context.foreignKeys[0].column
        ).toBe(
          'business_model_id'
        );

        expect(
          context.foreignKeys[0]
            .referencedSchema
        ).toBe(
          'simo_ai'
        );

        expect(
          context.foreignKeys[0]
            .referencedTable
        ).toBe(
          'ai_business_models'
        );

        expect(
          context.foreignKeys[0]
            .referencedColumn
        ).toBe(
          'id'
        );

        // ---------------------------------------------------------------------
        // API
        // ---------------------------------------------------------------------

        expect(
          context.api.baseUrl
        ).toBe(
          'http://localhost:3500'
        );

        expect(
          context.api.prefix
        ).toBe(
          '/ia'
        );

        expect(
          context.api.basePath
        ).toBe(
          '/ia/ai-business-model-departments'
        );

        expect(
          context.api.route
        ).toBe(
          'ai-business-model-departments'
        );

        // ---------------------------------------------------------------------
        // Ejemplos de API
        // ---------------------------------------------------------------------

        expect(
          context.apiExamples
        ).toBeDefined();

        expect(
          context.apiExamples.idExample
        ).toBe(
          1
        );

        expect(
          context.apiExamples.create
        ).toEqual({
          business_model_id:
            '550e8400-e29b-41d4-a716-446655440000',

          configuration_json: {
            enabled:
              true
          }
        });

        expect(
          context.apiExamples.update
        ).toEqual({
          business_model_id:
            '550e8400-e29b-41d4-a716-446655440000',

          configuration_json: {
            enabled:
              true
          },

          expected_version_no:
            1
        });

        expect(
          JSON.parse(
            context.apiExamples
              .createBody
          )
        ).toEqual(
          context.apiExamples.create
        );

        expect(
          JSON.parse(
            context.apiExamples
              .updateBody
          )
        ).toEqual(
          context.apiExamples.update
        );

        // ---------------------------------------------------------------------
        // Seguridad
        // ---------------------------------------------------------------------

        expect(
          context.security
        ).toEqual({
          jwt:
            true,

          permissions:
            true,

          organizationContext:
            true
        });

        // ---------------------------------------------------------------------
        // Permisos
        // ---------------------------------------------------------------------

        expect(
          context.permissions
        ).toEqual({
          view:
            'AI_BUSINESS_MODEL_DEPARTMENTS_VIEW',

          create:
            'AI_BUSINESS_MODEL_DEPARTMENTS_CREATE',

          edit:
            'AI_BUSINESS_MODEL_DEPARTMENTS_EDIT',

          delete:
            'AI_BUSINESS_MODEL_DEPARTMENTS_DELETE',

          reorder:
            'AI_BUSINESS_MODEL_DEPARTMENTS_REORDER',

          copy:
            'AI_BUSINESS_MODEL_DEPARTMENTS_COPY'
        });

        // ---------------------------------------------------------------------
        // Colección Postman
        // ---------------------------------------------------------------------

        expect(
          context.postmanCollection
        ).toBeDefined();

        expect(
          context.postmanCollection
            .collectionName
        ).toBe(
          'AiBusinessModelDepartments API'
        );

        expect(
          context.postmanCollection
            .moduleName
        ).toBe(
          'ai-business-model-departments'
        );

        expect(
          context.postmanCollection
            .baseUrl
        ).toBe(
          'http://localhost:3500'
        );

        expect(
          context.postmanCollection
            .basePath
        ).toBe(
          '/ia/ai-business-model-departments'
        );

        expect(
          context.postmanCollection
            .listUrl
        ).toBe(
          '{{baseUrl}}/ia/ai-business-model-departments'
        );

        expect(
          context.postmanCollection
            .getUrl
        ).toBe(
          '{{baseUrl}}/ia/ai-business-model-departments/{{id}}'
        );

        expect(
          context.postmanCollection
            .createUrl
        ).toBe(
          '{{baseUrl}}/ia/ai-business-model-departments'
        );

        expect(
          context.postmanCollection
            .updateUrl
        ).toBe(
          '{{baseUrl}}/ia/ai-business-model-departments/{{id}}'
        );

        expect(
          context.postmanCollection
            .deleteUrl
        ).toBe(
          '{{baseUrl}}/ia/ai-business-model-departments/{{id}}'
        );

        expect(
          context.postmanCollection
            .idExample
        ).toBe(
          1
        );

        expect(
          context.postmanCollection
            .bodyCreate
        ).toEqual(
          context.apiExamples
            .createBody
        );

        expect(
          context.postmanCollection
            .bodyUpdate
        ).toEqual(
          context.apiExamples
            .updateBody
        );

        expect(
          context.postmanCollection
            .jwt
        ).toBe(
          true
        );

        expect(
          context.postmanCollection
            .headers
        ).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              key:
                'Content-Type',

              value:
                'application/json',

              type:
                'text'
            }),

            expect.objectContaining({
              key:
                'Authorization',

              value:
                'Bearer {{token}}',

              type:
                'text'
            })
          ])
        );

        expect(
          context.postmanCollection
            .permissions
        ).toEqual(
          context.permissions
        );

                expect(
          context.postmanCollection
            .bodyCreateJson
        ).toBe(
          JSON.stringify(
            context.apiExamples
              .createBody
          )
        );

        expect(
          context.postmanCollection
            .bodyUpdateJson
        ).toBe(
          JSON.stringify(
            context.apiExamples
              .updateBody
          )
        );



      }
    );
  }
);