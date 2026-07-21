'use strict';

const GeneratorContextBuilder = require(
  '../src/context/generator-context.builder'
);

describe('GeneratorContextBuilder', () => {
  test('construye el modelo interno de Forge', () => {
    const builder = new GeneratorContextBuilder();

    const context = builder.build({
      source: {
        type: 'postgresql'
      },

      schema: 'simo_ai',

      table: 'ai_business_model_departments',

      columns: [
        {
          position: 1,
          name: 'id',
          dataType: 'bigint',
          nativeType: 'int8',
          nullable: false,
          identity: true
        },
        {
          position: 2,
          name: 'business_model_id',
          dataType: 'uuid',
          nativeType: 'uuid',
          nullable: false
        },
        {
          position: 3,
          name: 'configuration_json',
          dataType: 'jsonb',
          nativeType: 'jsonb',
          nullable: true
        },
        {
          position: 4,
          name: 'deleted_at',
          dataType: 'timestamp',
          nativeType: 'timestamp',
          nullable: true
        },
        {
          position: 5,
          name: 'version_no',
          dataType: 'integer',
          nativeType: 'int4',
          nullable: false
        }
      ],

      primaryKey: {
        name: 'pk_departments',
        columns: ['id']
      },

      foreignKeys: [
        {
          name: 'fk_business_model',
          column: 'business_model_id',
          referencedSchema: 'simo_ai',
          referencedTable: 'ai_business_models',
          referencedColumn: 'id'
        }
      ]
    });

    expect(context.forge.contextVersion).toBe('1.0.0');

    expect(context.source.type).toBe('postgresql');

    expect(context.database).toEqual({
      schema: 'simo_ai',
      table: 'ai_business_model_departments'
    });

    expect(context.names.module).toBe(
      'ai-business-model-departments'
    );

    expect(context.names.entity).toBe(
      'AiBusinessModelDepartments'
    );

    expect(context.capabilities.softDelete).toBe(true);

    expect(
      context.capabilities.optimisticLock
    ).toBe(true);

    expect(context.capabilities.jsonColumns).toEqual([
      'configuration_json'
    ]);
  });
});