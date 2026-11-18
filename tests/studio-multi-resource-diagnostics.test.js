'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const col = (name, type = 'uuid') => ({ name, type, nullable: false, defaultValue: null,
  maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null });
const sample = () => ({
  kind: 'studio.multitable.preview', version: 1, name: 'catalog', mode: 'READ_ONLY_PREVIEW',
  source: { profile: 'pg_sbntest', schema: 'product_hub' }, primaryTable: 'products',
  tables: [
    { name: 'products', columns: [col('id'), col('unsupported_field', 'point')],
      primaryKey: ['id'], settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } },
    { name: 'assignments', columns: [col('id'), col('product_id')], primaryKey: ['id'],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read', 'create'] } }
  ],
  relations: [{ fromTable: 'assignments', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }],
  foreignKeyGroups: [{ name: 'fk_assignments_products', fromTable: 'assignments',
    toTable: 'products', columns: [{ fromColumn: 'product_id', toColumn: 'id' }] }]
});
test('reports unsupported fields, permissions, dependencies and artifacts by resource', () => {
  const plan = createMultiGenerationPlan(sample());
  const detail = plan.preparation.diagnostics;
  expect(detail).toHaveLength(2);
  expect(detail[0]).toMatchObject({ table: 'products', enabled: true, status: 'blocked',
    permissions: ['read'] });
  expect(detail[0].fields.find(field => field.name === 'unsupported_field').issues.join(' '))
    .toContain('no soportado');
  expect(detail[1]).toMatchObject({ table: 'assignments', dependsOn: ['products'],
    permissions: ['read', 'create'] });
  expect(detail[1].relations[0].targetTable).toBe('products');
  expect(detail[1].artifacts).toHaveLength(7);
  expect(createMultiGenerationPlan(sample()).preparation).toEqual(plan.preparation);
  expect(plan.preparation).toMatchObject({ executable: false, readyForGeneration: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false });
});
test('disabled resources remain visible without proposed artifacts', () => {
  const input = sample();
  input.tables[0].settings.resourceEnabled = false;
  const detail = createMultiGenerationPlan(input).preparation.diagnostics;
  expect(detail[0]).toMatchObject({ table: 'products', enabled: false, status: 'disabled', artifacts: [] });
  expect(detail[1].relations[0].targetEnabled).toBe(false);
});
test('diagnostic field changes affect the preparation fingerprint', () => {
  const input = sample();
  const first = createMultiGenerationPlan(input).preparation.fingerprint;
  input.tables[0].columns[1].type = 'text';
  expect(createMultiGenerationPlan(input).preparation.fingerprint).not.toBe(first);
});
test('UI displays resource details without HTML injection', () => {
  const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');
  expect(html).toContain('id="designer-multi-diagnostics-resources"');
  expect(js).toContain('for (const resource of preparation.diagnostics || [])');
  expect(js).toContain('resources.replaceChildren()');
  expect(js).toContain('item.textContent = value');
  expect(js).toContain('heading.textContent = resource.table');
});
