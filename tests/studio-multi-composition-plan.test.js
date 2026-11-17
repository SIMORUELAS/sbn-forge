'use strict';
const { createMultiCompositionPlan } = require('../studio/multi-composition-plan');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const column = name => ({ name, type: 'uuid', nullable: false, defaultValue: null,
  maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null });
const sample = () => ({
  kind: 'studio.multitable.preview', version: 1, name: 'catalog', mode: 'READ_ONLY_PREVIEW',
  source: { profile: 'pg_sbntest', schema: 'product_hub' }, primaryTable: 'products',
  tables: ['assignments', 'products', 'categories'].map(name => ({
    name, columns: [column('id'), column('parent_id')],
    primaryKey: ['id'], settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] }
  })),
  relations: [
    { fromTable: 'assignments', fromColumn: 'parent_id', toTable: 'products', toColumn: 'id' },
    { fromTable: 'products', fromColumn: 'parent_id', toTable: 'categories', toColumn: 'id' }
  ],
  foreignKeyGroups: [
    { name: 'fk_assignment_product', fromTable: 'assignments', toTable: 'products',
      columns: [{ fromColumn: 'parent_id', toColumn: 'id' }] },
    { name: 'fk_product_category', fromTable: 'products', toTable: 'categories',
      columns: [{ fromColumn: 'parent_id', toColumn: 'id' }] }
  ]
});
test('orders resources by FK dependencies regardless of input table order', () => {
  const input = sample();
  const plan = createMultiCompositionPlan(input);
  expect(plan.orderedTables).toEqual(['categories', 'products', 'assignments']);
  expect(plan.batches).toEqual([['categories'], ['products'], ['assignments']]);
  expect(plan.artifacts).toHaveLength(21);
  expect(plan.artifacts.map(item => item.sequence)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
  expect(plan.complete).toBe(true);
  expect(plan).toMatchObject({ executable: false, readyForGeneration: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false,
    totals: { resources: 3, ordered: 3, catalogArtifacts: 21, written: 0, published: 0 } });
  expect(createMultiGenerationPlan(input).composition).toEqual(plan);
});
test('detects dependency cycles without emitting a false complete order', () => {
  const input = sample();
  input.relations.push({ fromTable: 'categories', fromColumn: 'parent_id', toTable: 'assignments', toColumn: 'id' });
  input.foreignKeyGroups.push({ name: 'fk_category_assignment', fromTable: 'categories', toTable: 'assignments',
    columns: [{ fromColumn: 'parent_id', toColumn: 'id' }] });
  const plan = createMultiCompositionPlan(input);
  expect(plan.complete).toBe(false);
  expect(plan.blockers.join(' ')).toContain('Dependencias circulares');
  expect(plan.orderedTables).toEqual([]);
  expect(plan.artifacts).toHaveLength(0);
});
test('blocks dependency on disabled resource', () => {
  const input = sample();
  input.tables.find(table => table.name === 'products').settings.resourceEnabled = false;
  const plan = createMultiCompositionPlan(input);
  expect(plan.blockers.join(' ')).toContain('dependencia no habilitada');
  expect(plan.artifacts.every(artifact => artifact.table !== 'products')).toBe(true);
});
