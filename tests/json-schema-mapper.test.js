'use strict';

const {
  mapPostgresType,
  buildJsonSchemaProperty
} = require('../src/core/json-schema-mapper');

describe('json-schema-mapper', () => {
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
});