'use strict';
const { createMultiEngineBridge } = require('../studio/multi-engine-bridge');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const col = (name, type = 'uuid') => ({ name, type, nullable: false, defaultValue: null,
  maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null });
const sample = () => ({
  kind: 'studio.multitable.preview', version: 1, name: 'catalog', mode: 'READ_ONLY_PREVIEW',
  source: { profile: 'pg_test', schema: 'product_hub' }, primaryTable: 'products',
  tables: [
    { name: 'products', columns: [col('id'), col('name', 'text')], primaryKey: ['id'],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } },
    { name: 'items', columns: [col('id'), col('product_id')], primaryKey: ['id'],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } }
  ],
  relations: [{ fromTable: 'items', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }],
  foreignKeyGroups: [{ name: 'fk_items_products', fromTable: 'items', toTable: 'products',
    columns: [{ fromColumn: 'product_id', toColumn: 'id' }] }]
});
test('prepares real Forge contexts in dependency order without writing artifacts', () => {
  const bridge = createMultiEngineBridge(sample());
  expect(bridge.orderedTables).toEqual(['products', 'items']);
  expect(bridge.resources.map(resource => resource.status)).toEqual(['context-ready', 'context-ready']);
  expect(bridge.resources[1].foreignKeys).toBe(1);
  expect(bridge).toMatchObject({ mode: 'simulation-only', executable: false,
    readyForGeneration: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    totals: { written: 0, published: 0 } });
  expect(createMultiEngineBridge(sample())).toEqual(bridge);
  expect(createMultiGenerationPlan(sample()).bridge).toEqual(bridge);
});
test('fails closed for unsupported fields and composite primary keys', () => {
  const input = sample();
  input.tables[0].columns.push(col('location', 'point'));
  input.tables[1].primaryKey = ['id', 'product_id'];
  const bridge = createMultiEngineBridge(input);
  expect(bridge.resources.every(resource => !resource.contextPrepared)).toBe(true);
  expect(bridge.resources.every(resource => resource.status === 'blocked')).toBe(true);
  expect(bridge.executable).toBe(false);
});
test('cycles never silently become executable or context-ready', () => {
  const input = sample();
  input.tables[0].columns.push(col('item_id'));
  input.relations.push({ fromTable: 'products', fromColumn: 'item_id', toTable: 'items', toColumn: 'id' });
  input.foreignKeyGroups.push({ name: 'fk_products_items', fromTable: 'products', toTable: 'items',
    columns: [{ fromColumn: 'item_id', toColumn: 'id' }] });
  const bridge = createMultiEngineBridge(input);
  expect(bridge.contextReady).toBe(0);
  expect(bridge.resources.every(resource => resource.status === 'blocked')).toBe(true);
  expect(bridge.blockers.join(' ')).toContain('circulares');
});
