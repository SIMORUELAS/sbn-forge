'use strict';

const DefinitionBuilder = require(
  '../src/core/definition-builder'
);

describe('DefinitionBuilder', () => {
  test(
    'construye una definición desde metadata normalizada',
    () => {
      const builder =
        new DefinitionBuilder();

      const definition = builder.build({
        schema: 'simo_ai',

        table:
          'ai_business_model_teams',

        columns: [
          {
            name: 'id',
            dataType: 'bigint',
            nativeType: 'int8',
            nullable: false,
            defaultValue: null,
            maxLength: null,
            precision: 64,
            scale: 0,
            identity: true
          },
          {
            name: 'business_model_id',
            dataType: 'uuid',
            nativeType: 'uuid',
            nullable: false,
            defaultValue: null,
            maxLength: null,
            precision: null,
            scale: null,
            identity: false
          }
        ],

        primaryKey: {
          name:
            'pk_ai_business_model_teams',

          columns: ['id']
        },

        foreignKeys: [
          {
            name:
              'fk_ai_business_model_teams_model',

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

      expect(definition).toEqual({
        schema: 'simo_ai',

        table:
          'ai_business_model_teams',

        columns: [
          {
            name: 'id',
            type: 'bigint',
            nullable: false,
            primaryKey: true,
            generated: true,
            writable: false,
            precision: 64,
            scale: 0
          },
          {
            name:
              'business_model_id',

            type: 'uuid',
            nullable: false,
            primaryKey: false,
            generated: false,
            writable: true,

            foreignKey: {
              schema: 'simo_ai',
              table:
                'ai_business_models',
              column: 'id'
            }
          }
        ]
      });
    }
  );

  test(
    'incluye el valor por defecto',
    () => {
      const builder =
        new DefinitionBuilder();

      const definition = builder.build({
        schema: 'public',
        table: 'example',

        columns: [
          {
            name: 'is_active',
            dataType: 'boolean',
            nullable: false,
            defaultValue: 'true',
            identity: false
          }
        ],

        primaryKey: {
          columns: []
        },

        foreignKeys: []
      });

      expect(
        definition.columns[0]
      ).toMatchObject({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        primaryKey: false,
        generated: false,
        hasDefault: true,
        default: 'true',
        writable: true
      });

      expect(
        definition.columns[0]
      ).not.toHaveProperty(
        'foreignKey'
      );
    }
  );

  test(
    'omite foreignKey cuando la columna no tiene relación',
    () => {
      const builder =
        new DefinitionBuilder();

      const definition = builder.build({
        schema: 'public',
        table: 'example',

        columns: [
          {
            name: 'name',
            dataType:
              'character varying',
            nativeType: 'varchar',
            nullable: true,
            defaultValue: null,
            maxLength: 100,
            precision: null,
            scale: null,
            identity: false
          }
        ],

        primaryKey: {
          columns: []
        },

        foreignKeys: []
      });

      expect(
        definition.columns[0]
      ).toEqual({
        name: 'name',
        type:
          'character varying',
        nullable: true,
        primaryKey: false,
        generated: false,
        writable: true,
        length: 100
      });

      expect(
        definition.columns[0]
      ).not.toHaveProperty(
        'foreignKey'
      );
    }
  );



  test(
  'marca una primary key UUID con default como no escribible',
  () => {
    const builder =
      new DefinitionBuilder();

    const definition =
      builder.build({
        schema:
          'simo_ai',

        table:
          'ai_business_models',

        columns: [
          {
            name:
              'id',

            dataType:
              'uuid',

            nativeType:
              'uuid',

            nullable:
              false,

            identity:
              false,

            writable:
              true,

            defaultValue:
              'gen_random_uuid()'
          },
          {
            name:
              'code',

            dataType:
              'character varying',

            nativeType:
              'character varying',

            nullable:
              false,

            identity:
              false,

            writable:
              true
          }
        ],

        primaryKey: {
          name:
            'pk_ai_business_models',

          columns: [
            'id'
          ]
        },

        foreignKeys:
          []
      });

    const idColumn =
      definition.columns.find(
        column =>
          column.name === 'id'
      );

    expect(
      idColumn
    ).toEqual({
      name:
        'id',

      type:
        'uuid',

      nullable:
        false,

      primaryKey:
        true,

      generated:
        false,

      writable:
        false,

      hasDefault:
        true,

      default:
        'gen_random_uuid()'
    });

    expect(
      definition.columns.find(
        column =>
          column.name === 'code'
      ).writable
    ).toBe(true);
  }
);





});