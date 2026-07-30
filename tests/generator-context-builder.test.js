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
          generated: true
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
          nullable: true,
          defaultValue: null
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
          nullable: false,
          defaultValue: 1
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

    // -------------------------------------------------------------------------
    // Información general del contexto
    // -------------------------------------------------------------------------

    expect(
      context.forge.contextVersion
    ).toBe('1.0.0');

    expect(
      context.source.type
    ).toBe('postgresql');

    expect(
      context.database
    ).toEqual({
      schema: 'simo_ai',
      table: 'ai_business_model_departments'
    });

    // -------------------------------------------------------------------------
    // Convenciones de nombres
    // -------------------------------------------------------------------------

    expect(
      context.names.module
    ).toBe('ai-business-model-departments');

    expect(
      context.names.entity
    ).toBe('AiBusinessModelDepartments');

    // -------------------------------------------------------------------------
    // Capacidades detectadas
    // -------------------------------------------------------------------------

    expect(
      context.capabilities.softDelete
    ).toBe(true);

    expect(
      context.capabilities.optimisticLock
    ).toBe(true);

    expect(
      context.capabilities.jsonColumns
    ).toEqual([
      'configuration_json'
    ]);

    // -------------------------------------------------------------------------
    // Columnas normalizadas
    // -------------------------------------------------------------------------

    expect(
      context.columns
    ).toHaveLength(5);

    expect(
      context.columns.find(
        column => column.name === 'id'
      ).generated
    ).toBe(true);

    expect(
      context.columns.find(
        column => column.name === 'id'
      ).identity
    ).toBe(true);

    expect(
      context.columns.find(
        column => column.name === 'id'
      ).writable
    ).toBe(false);

    expect(
      context.columns.find(
        column => column.name === 'business_model_id'
      ).writable
    ).toBe(true);

    expect(
      context.columns.find(
        column => column.name === 'configuration_json'
      ).writable
    ).toBe(true);

    expect(
      context.columns.find(
        column => column.name === 'configuration_json'
      ).hasDefaultValue
    ).toBe(false);

    expect(
      context.columns.find(
        column => column.name === 'deleted_at'
      ).writable
    ).toBe(false);

    expect(
      context.columns.find(
        column => column.name === 'version_no'
      ).writable
    ).toBe(false);

    expect(
      context.columns.find(
        column => column.name === 'version_no'
      ).hasDefaultValue
    ).toBe(true);

    expect(
      context.columns.every(
        column => column.jsonSchema
      )
    ).toBe(true);

    // -------------------------------------------------------------------------
    // Columnas escribibles
    // -------------------------------------------------------------------------

    expect(
      context.writableColumns.map(
        column => column.name
      )
    ).toEqual([
      'business_model_id',
      'configuration_json'
    ]);

    expect(
      context.writableColumns
    ).toHaveLength(2);

    expect(
      context.requiredWritableColumns.map(
        column => column.name
      )
    ).toEqual([
      'business_model_id'
    ]);

    // -------------------------------------------------------------------------
    // Mapa de columnas
    // -------------------------------------------------------------------------

    expect(
      Object.keys(context.columnMap)
    ).toHaveLength(5);

    expect(
      context.columnMap.id.identity
    ).toBe(true);

    expect(
      context.columnMap.id.writable
    ).toBe(false);

    expect(
      context.columnMap.business_model_id.name
    ).toBe('business_model_id');

    expect(
      context.columnMap.configuration_json.name
    ).toBe('configuration_json');

    expect(
      context.columnMap.deleted_at.writable
    ).toBe(false);

    expect(
      context.columnMap.version_no.writable
    ).toBe(false);

    // -------------------------------------------------------------------------
    // Llave primaria
    // -------------------------------------------------------------------------

    expect(
      context.primaryKey
    ).toEqual({
      name: 'pk_departments',
      columns: ['id']
    });

    // -------------------------------------------------------------------------
    // Llaves foráneas
    // -------------------------------------------------------------------------

    expect(
      context.foreignKeys
    ).toHaveLength(1);

    expect(
      context.foreignKeys[0].name
    ).toBe('fk_business_model');

    expect(
      context.foreignKeys[0].column
    ).toBe('business_model_id');

    expect(
      context.foreignKeys[0].referencedSchema
    ).toBe('simo_ai');

    expect(
      context.foreignKeys[0].referencedTable
    ).toBe('ai_business_models');

    expect(
      context.foreignKeys[0].referencedColumn
    ).toBe('id');
  });
});