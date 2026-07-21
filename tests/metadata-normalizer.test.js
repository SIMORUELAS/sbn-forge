'use strict';

const MetadataNormalizer = require(
  '../src/context/metadata-normalizer'
);

describe('MetadataNormalizer', () => {
  test('normaliza metadatos PostgreSQL', () => {
    const normalizer = new MetadataNormalizer();

    const result = normalizer.normalize({
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
        }
      ],
      primaryKey: {
        name: 'pk_departments',
        columns: ['id']
      },
      foreignKeys: [],
      indexes: []
    });

    expect(result.source.type).toBe('postgresql');
    expect(result.schema).toBe('simo_ai');

    expect(result.table).toBe(
      'ai_business_model_departments'
    );

    expect(result.columns[0]).toMatchObject({
      name: 'id',
      dataType: 'bigint',
      nativeType: 'int8',
      nullable: false,
      identity: true
    });

    expect(result.primaryKey.columns).toEqual(['id']);
  });

  test('normaliza una definición JSON', () => {
    const normalizer = new MetadataNormalizer();

    const result = normalizer.normalize({
      schemaName: 'simo_ai',
      tableName: 'ai_business_models',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          nullable: false
        }
      ],
      primaryKey: ['id']
    });

    expect(result.source.type).toBe('json');
    expect(result.schema).toBe('simo_ai');
    expect(result.table).toBe('ai_business_models');
    expect(result.columns[0].dataType).toBe('uuid');
  });

  test('rechaza metadatos sin columnas', () => {
    const normalizer = new MetadataNormalizer();

    expect(() =>
      normalizer.normalize({
        schema: 'simo_ai',
        table: 'empty_table',
        columns: []
      })
    ).toThrow(
      'Los metadatos deben incluir al menos una columna'
    );
  });
});