'use strict';

const definition = require(
  '../examples/ai_business_model_departments.json'
);

const {
  createGeneratorContext,
  isCreateRequiredColumn
} = require('../src/core/generator-context');

test('detecta capacidades SBN', () => {
  const context = createGeneratorContext(
    definition,
    {
      generatedAt:
        '2026-07-18T00:00:00.000Z'
    }
  );

  expect(
    context.capabilities
  ).toMatchObject({
    softDelete: true,
    audit: true,
    versioning: true,
    json: true,
    foreignKeys: true
  });

  expect(
    context.writableColumns.map(
      column => column.name
    )
  ).toEqual([
    'business_model_id',
    'department_id',
    'is_required',
    'execution_order',
    'recommended_plan',
    'configuration_json'
  ]);

  expect(
    context.permissions
  ).toContain(
    'AI_BUSINESS_MODEL_DEPARTMENTS_VIEW'
  );
});

test('construye los campos requeridos para create', () => {
  const context = createGeneratorContext(
    definition,
    {
      generatedAt:
        '2026-07-18T00:00:00.000Z'
    }
  );

  expect(
    context.createRequiredColumns.map(
      column => column.name
    )
  ).toEqual([
    'business_model_id',
    'department_id'
  ]);
});

test('marca como requerida una columna obligatoria', () => {
  expect(
    isCreateRequiredColumn({
      writable: true,
      generated: false,
      nullable: false,
      hasDefault: false,
      primaryKey: false
    })
  ).toBe(true);
});

test('no marca como requerida una columna con default', () => {
  expect(
    isCreateRequiredColumn({
      writable: true,
      generated: false,
      nullable: false,
      hasDefault: true,
      primaryKey: false
    })
  ).toBe(false);
});

test('no marca como requerida una columna nullable', () => {
  expect(
    isCreateRequiredColumn({
      writable: true,
      generated: false,
      nullable: true,
      hasDefault: false,
      primaryKey: false
    })
  ).toBe(false);
});

test('no marca como requerida una columna generada', () => {
  expect(
    isCreateRequiredColumn({
      writable: true,
      generated: true,
      nullable: false,
      hasDefault: false,
      primaryKey: false
    })
  ).toBe(false);
});

test('no marca como requerida una columna no writable', () => {
  expect(
    isCreateRequiredColumn({
      writable: false,
      generated: false,
      nullable: false,
      hasDefault: false,
      primaryKey: false
    })
  ).toBe(false);
});

test('no marca como requerida una llave primaria', () => {
  expect(
    isCreateRequiredColumn({
      writable: true,
      generated: false,
      nullable: false,
      hasDefault: false,
      primaryKey: true
    })
  ).toBe(false);
});
