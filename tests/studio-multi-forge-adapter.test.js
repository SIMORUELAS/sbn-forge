'use strict';
const { createMultiForgeAdapter, normalizeType } = require('../studio/multi-forge-adapter');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const col = (name, type = 'uuid') => ({ name, type, nullable: false,
  defaultValue: null, maxLength: null, precision: null, scale: null,
  identity: false, identityGeneration: null });
const sample = () => ({ kind: 'studio.multitable.preview', version: 1,
  name: 'catalog', mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_sbntest', schema: 'product_hub' },
  primaryTable: 'products', tables: [{ name: 'products', primaryKey: ['id'],
    columns: [col('id'), col('name', 'character varying(80)')],
    fieldSettings: { name: { visible: true, editable: false, required: false } } }],
  relations: [], foreignKeyGroups: [] });
test('adapts PostgreSQL types and protected field settings without executing generators', () => {
  const adapted = createMultiForgeAdapter(sample());
  expect(normalizeType('numeric(12,2)')).toBe('numeric');
  expect(adapted.resources[0].definition.columns).toEqual([
    expect.objectContaining({ name: 'id', primaryKey: true, writable: false }),
    expect.objectContaining({ name: 'name', type: 'character varying', length: null, writable: false })
  ]);
  expect(adapted).toMatchObject({ executable: false, readyForGeneration: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false });
  const plan = createMultiGenerationPlan(sample());
  expect(plan.adapter).toEqual(adapted);
  expect(plan.totals.written).toBe(0);
});
test('blocks composite primary keys and unsupported types', () => {
  const value = sample();
  value.tables[0].primaryKey = ['id', 'name'];
  value.tables[0].columns.push(col('geometry', 'geography'));
  const adapted = createMultiForgeAdapter(value);
  expect(adapted.blockers.join(' ')).toContain('Clave primaria compuesta');
  expect(adapted.blockers.join(' ')).toContain('Tipos no compatibles');
  expect(adapted.compatible).toBe(false);
});
