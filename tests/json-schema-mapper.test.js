'use strict';

const {
  mapPostgresType,
  buildJsonSchemaProperty
} = require('../src/core/json-schema-mapper');

describe('json-schema-mapper', () => {
  test('preserva restricciones empresariales configurables', () => {
    expect(buildJsonSchemaProperty({ type: 'smallint', minimum: 1, maximum: 100 }))
      .toEqual({ type: 'integer', minimum: 1, maximum: 100 });
    expect(buildJsonSchemaProperty({
      type: 'varchar',
      enum: ['VIEW', 'OPERATE', 'MANAGE', 'ADMIN', 'CUSTOM']
    })).toEqual({
      type: 'string',
      enum: ['VIEW', 'OPERATE', 'MANAGE', 'ADMIN', 'CUSTOM']
    });
  });

  test('convierte uuid a string con formato uuid', () => {
    expect(
      mapPostgresType({
        type: 'uuid'
      })
    ).toEqual({
      type: 'string',
      format: 'uuid'
    });
  });

  test('convierte integer a integer', () => {
    expect(
      mapPostgresType({
        type: 'integer'
      })
    ).toEqual({
      type: 'integer'
    });
  });

  test('convierte numeric a number', () => {
    expect(
      mapPostgresType({
        type: 'numeric'
      })
    ).toEqual({
      type: 'number'
    });
  });

  test('convierte jsonb a object', () => {
    expect(
      mapPostgresType({
        type: 'jsonb'
      })
    ).toEqual({
      type: 'object'
    });
  });

  test('agrega maxLength a columnas string usando maxLength', () => {
    expect(
      buildJsonSchemaProperty({
        type: 'varchar',
        maxLength: 30
      })
    ).toEqual({
      type: 'string',
      maxLength: 30
    });
  });

  test('convierte length de PostgreSQL en maxLength', () => {
    expect(
      buildJsonSchemaProperty({
        type: 'varchar',
        length: 30
      })
    ).toEqual({
      type: 'string',
      maxLength: 30
    });
  });
  test('conserva nullable en propiedades JSON Schema', () => {
    expect(
      buildJsonSchemaProperty({
        type: 'uuid',
        nullable: true
      })
    ).toEqual({
      type: 'string',
      format: 'uuid',
      nullable: true
    });

    expect(
      buildJsonSchemaProperty({
        type: 'integer',
        nullable: true
      })
    ).toEqual({
      type: 'integer',
      nullable: true
    });

    expect(
      buildJsonSchemaProperty({
        type: 'boolean',
        nullable: true
      })
    ).toEqual({
      type: 'boolean',
      nullable: true
    });

    expect(
      buildJsonSchemaProperty({
        type: 'jsonb',
        nullable: true
      })
    ).toEqual({
      type: 'object',
      nullable: true
    });

    expect(
      buildJsonSchemaProperty({
        type: 'varchar',
        nullable: true,
        length: 50
      })
    ).toEqual({
      type: 'string',
      maxLength: 50,
      nullable: true
    });
  });
});
