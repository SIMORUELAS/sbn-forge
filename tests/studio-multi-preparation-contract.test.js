'use strict';
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const { createMultiPreparationContract } = require('../studio/multi-preparation-contract');
const col = name => ({ name, type: 'uuid', nullable: false, defaultValue: null,
  maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null });
const sample = () => ({
  kind: 'studio.multitable.preview', version: 1, name: 'catalog', mode: 'READ_ONLY_PREVIEW',
  source: { profile: 'pg_sbntest', schema: 'product_hub' }, primaryTable: 'products',
  tables: [
    { name: 'assignments', primaryKey: ['id'], columns: [col('id'), col('product_id')],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } },
    { name: 'products', primaryKey: ['id'], columns: [col('id')],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read', 'create'] } }
  ],
  relations: [{ fromTable: 'assignments', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }],
  foreignKeyGroups: [{ name: 'fk_assignment_product', fromTable: 'assignments', toTable: 'products',
    columns: [{ fromColumn: 'product_id', toColumn: 'id' }] }]
});
test('integrates deterministic preparation evidence without authorizing generation', () => {
  const plan = createMultiGenerationPlan(sample());
  const preparation = plan.preparation;
  expect(preparation).toMatchObject({ mode: 'review-only', executable: false,
    readyForGeneration: false, generationAuthorized: false, installationAuthorized: false,
    publicationAuthorized: false, structurallyComplete: false,
    totals: { resources: 2, ordered: 2, artifacts: 14, written: 0, published: 0 } });
  expect(preparation.orderedTables).toEqual(['products', 'assignments']);
  expect(preparation.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(preparation).toEqual(createMultiPreparationContract(plan));
  expect(preparation).toEqual(createMultiGenerationPlan(sample()).preparation);
  expect(preparation.blockers.join(' ')).toContain('no están conectados');
});
test('changes fingerprint when permissions change', () => {
  const input = sample();
  const before = createMultiGenerationPlan(input).preparation.fingerprint;
  input.tables[1].settings.permissions = ['read'];
  const after = createMultiGenerationPlan(input).preparation.fingerprint;
  expect(after).not.toBe(before);
});
test('rejects unsafe plan flags and records unresolved circular dependencies', () => {
  const input = sample();
  input.tables[1].columns.push(col('assignment_id'));
  input.relations.push({ fromTable: 'products', fromColumn: 'assignment_id',
    toTable: 'assignments', toColumn: 'id' });
  input.foreignKeyGroups.push({ name: 'fk_product_assignment', fromTable: 'products',
    toTable: 'assignments', columns: [{ fromColumn: 'assignment_id', toColumn: 'id' }] });
  const plan = createMultiGenerationPlan(input);
  expect(plan.preparation.orderedTables).toHaveLength(0);
  expect(plan.preparation.blockers.join(' ')).toContain('Dependencias circulares');
  expect(plan.preparation.structurallyComplete).toBe(false);
  expect(() => createMultiPreparationContract({ ...plan, executable: true })).toThrow('no seguro');
});
