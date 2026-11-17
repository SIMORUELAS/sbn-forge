'use strict';
const { assessMultiCompatibility } = require('../studio/multi-compatibility-assessment');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const column = (name, type = 'uuid') => ({ name, type, nullable: false, defaultValue: null,
  maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null });
const sample = () => ({ kind: 'studio.multitable.preview', version: 1, name: 'products',
  mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_sbntest', schema: 'product_hub' },
  primaryTable: null, tables: [
    { name: 'products', columns: [column('id')], primaryKey: ['id'] },
    { name: 'links', columns: [column('product_id')], primaryKey: ['product_id'] }
  ], relations: [{ fromTable: 'links', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }],
  foreignKeyGroups: [{ name: 'fk_product', fromTable: 'links', toTable: 'products',
    columns: [{ fromColumn: 'product_id', toColumn: 'id' }] }] });
test('reports structured compatibility without enabling generation', () => {
  const assessment = assessMultiCompatibility(sample());
  expect(assessment.resources).toHaveLength(2);
  expect(assessment.blockers.some(message => message.includes('Relación sin restricción'))).toBe(false);
  expect(assessment).toMatchObject({ executable: false, readyForGeneration: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false });
  const plan = createMultiGenerationPlan(sample());
  expect(plan.compatibility).toEqual(assessment);
  expect(plan.totals.written).toBe(0);
});
test('blocks ungrouped foreign keys and missing source metadata', () => {
  const value = sample();
  value.foreignKeyGroups = [];
  delete value.tables[0].columns[0].defaultValue;
  const assessment = assessMultiCompatibility(value);
  expect(assessment.blockers.join(' ')).toContain('Relación sin restricción');
  expect(assessment.blockers.join(' ')).toContain('Metadatos incompletos');
  expect(assessment.compatible).toBe(false);
});
test('detects unsupported types and non-primary targets needing unique evidence', () => {
  const value = sample();
  value.tables[0].columns.push(column('code', 'geography'));
  value.relations[0].toColumn = 'code';
  value.foreignKeyGroups[0].columns[0].toColumn = 'code';
  const assessment = assessMultiCompatibility(value);
  expect(assessment.blockers.join(' ')).toContain('tipo PostgreSQL no soportado');
  expect(assessment.warnings.join(' ')).toContain('requiere evidencia UNIQUE');
});
