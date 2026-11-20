'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateMultiIsolated } = require('../studio/multi-isolated-generation');
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
test('generates and verifies two API modules in a disposable isolated directory', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-multi-test-'));
  try {
    const result = await generateMultiIsolated(sample(), { tempRoot: parent });
    expect(result.orderedTables).toEqual(['products', 'items']);
    expect(result.totals).toEqual({ resources: 2, planned: 14, written: 14, published: 0 });
    expect(result).toMatchObject({ databaseModified: false, published: false,
      installationAuthorized: false, publicationAuthorized: false });
    for (const artifact of result.artifacts) {
      expect((await fs.stat(path.join(result.directory, artifact.path))).isFile()).toBe(true);
    }
    const route = result.artifacts.find(item => item.table === 'items' && item.path.endsWith('.routes.js'));
    expect(route).toBeDefined();
    expect(await fs.readFile(path.join(result.directory, route.path), 'utf8'))
      .toContain('requireAuth');
    const manifest = result.artifacts.find(item => item.table === 'items' && item.path.endsWith('manifest.json'));
    const data = JSON.parse(await fs.readFile(path.join(result.directory, manifest.path), 'utf8'));
    expect(data.definition.foreignKeys).toHaveLength(1);
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});
test('rejects unsupported resources before creating an output directory', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-multi-blocked-'));
  try {
    const input = sample();
    input.tables[0].columns.push(col('location', 'point'));
    await expect(generateMultiIsolated(input, { tempRoot: parent }))
      .rejects.toThrow('bloqueada');
    expect(await fs.readdir(parent)).toEqual([]);
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});
test('rejects cycles before creating an output directory', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-multi-cycle-'));
  try {
    const input = sample();
    input.tables[0].columns.push(col('item_id'));
    input.relations.push({ fromTable: 'products', fromColumn: 'item_id', toTable: 'items', toColumn: 'id' });
    input.foreignKeyGroups.push({ name: 'fk_products_items', fromTable: 'products', toTable: 'items',
      columns: [{ fromColumn: 'item_id', toColumn: 'id' }] });
    await expect(generateMultiIsolated(input, { tempRoot: parent }))
      .rejects.toThrow('bloqueada');
    expect(await fs.readdir(parent)).toEqual([]);
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});
