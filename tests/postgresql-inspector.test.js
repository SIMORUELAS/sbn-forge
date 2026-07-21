'use strict';

const PostgreSqlInspector = require(
  '../src/inspectors/postgresql/postgresql-inspector'
);

describe('PostgreSqlInspector', () => {
  test('inspecciona y normaliza una tabla PostgreSQL', async () => {
    const reader = {
      tableExists: jest.fn().mockResolvedValue(true),

      readColumns: jest.fn().mockResolvedValue([
        {
          ordinal_position: 1,
          column_name: 'id',
          data_type: 'bigint',
          udt_name: 'int8',
          is_nullable: 'NO',
          column_default: null,
          character_maximum_length: null,
          numeric_precision: 64,
          numeric_scale: 0,
          is_identity: 'YES',
          identity_generation: 'ALWAYS'
        },
        {
          ordinal_position: 2,
          column_name: 'business_model_id',
          data_type: 'uuid',
          udt_name: 'uuid',
          is_nullable: 'NO',
          column_default: null,
          character_maximum_length: null,
          numeric_precision: null,
          numeric_scale: null,
          is_identity: 'NO',
          identity_generation: null
        }
      ]),

      readPrimaryKey: jest.fn().mockResolvedValue([
        {
          constraint_name: 'pk_departments',
          column_name: 'id',
          ordinal_position: 1
        }
      ]),

      readForeignKeys: jest.fn().mockResolvedValue([
        {
          constraint_name: 'fk_business_model',
          column_name: 'business_model_id',
          referenced_schema: 'simo_ai',
          referenced_table: 'ai_business_models',
          referenced_column: 'id'
        }
      ]),

      readIndexes: jest.fn().mockResolvedValue([])
    };

    const datasource = {
      query: jest.fn()
    };

    const inspector = new PostgreSqlInspector(
      datasource,
      { reader }
    );

    const metadata = await inspector.inspect({
      schema: 'simo_ai',
      table: 'ai_business_model_departments'
    });

    expect(metadata.source.type).toBe('postgresql');
    expect(metadata.schema).toBe('simo_ai');
    expect(metadata.table).toBe(
      'ai_business_model_departments'
    );

    expect(metadata.columns).toHaveLength(2);
    expect(metadata.columns[0].identity).toBe(true);

    expect(metadata.primaryKey.columns).toEqual(['id']);

    expect(metadata.foreignKeys[0]).toEqual({
      name: 'fk_business_model',
      column: 'business_model_id',
      referencedSchema: 'simo_ai',
      referencedTable: 'ai_business_models',
      referencedColumn: 'id'
    });
  });

  test('rechaza identificadores inválidos', async () => {
    const datasource = {
      query: jest.fn()
    };

    const inspector = new PostgreSqlInspector(datasource);

    await expect(
      inspector.inspect({
        schema: 'simo_ai; DROP TABLE users;',
        table: 'users'
      })
    ).rejects.toThrow(
      'schema contiene un identificador inválido'
    );
  });

  test('informa cuando la tabla no existe', async () => {
    const reader = {
      tableExists: jest.fn().mockResolvedValue(false)
    };

    const datasource = {
      query: jest.fn()
    };

    const inspector = new PostgreSqlInspector(
      datasource,
      { reader }
    );

    await expect(
      inspector.inspect({
        schema: 'simo_ai',
        table: 'tabla_inexistente'
      })
    ).rejects.toThrow(
      'La tabla simo_ai.tabla_inexistente no existe'
    );
  });
});