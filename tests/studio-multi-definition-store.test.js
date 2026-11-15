'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createMultiDefinitionStore, validateMultiDefinition } = require('../studio/multi-definition-store');
describe('Studio multitable persistence boundaries', () => {
  let dir;
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-multi-')); });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });
  const example = () => ({
    kind: 'studio.multitable.preview', version: 1, name: 'product_hub_module',
    mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_sbntest', schema: 'product_hub' },
    primaryTable: null,
    tables: [
      { name: 'managed_products', columns: [{ name: 'id', type: 'uuid', nullable: false }], primaryKey: ['id'] },
      { name: 'product_certifications', columns: [
        { name: 'id', type: 'uuid', nullable: false },
        { name: 'managed_product_id', type: 'uuid', nullable: false }
      ], primaryKey: ['id'] }
    ],
    relations: [{ fromTable: 'product_certifications', fromColumn: 'managed_product_id',
      toTable: 'managed_products', toColumn: 'id' }],
    generationAuthorized: true, installationAuthorized: true, publicationAuthorized: true
  });
  test('saves and reloads all tables and relations while stripping authorization flags', async () => {
    const store = createMultiDefinitionStore(dir);
    const saved = await store.save(example());
    expect(saved.tables).toHaveLength(2);
    expect(saved.relations).toHaveLength(1);
    expect(saved.primaryTable).toBeNull();
    expect(saved.generationAuthorized).toBe(false);
    expect(saved.installationAuthorized).toBe(false);
    expect(saved.publicationAuthorized).toBe(false);
    expect(await store.list()).toEqual(['product_hub_module']);
    expect(await store.get('product_hub_module')).toEqual(saved);
  });
  test('persists editable resource settings and protects system fields', async () => {
    const definition = example();
    definition.tables[0].settings = { label: 'Productos', resourceEnabled: true,
      formEnabled: true, permissions: ['read', 'create'] };
    definition.tables[0].fieldSettings = {
      id: { visible: true, editable: false, required: false }
    };
    const store = createMultiDefinitionStore(dir);
    await store.save(definition);
    const saved = await store.get(definition.name);
    expect(saved.tables[0].settings.label).toBe('Productos');
    expect(saved.tables[0].settings.permissions).toEqual(['read', 'create']);
    expect(saved.tables[0].fieldSettings.id.editable).toBe(false);
    definition.tables[0].fieldSettings.id.editable = true;
    expect(() => validateMultiDefinition(definition)).toThrow(/protegida/);
  });
  test('rejects traversal, missing columns, foreign relations and invalid primary table', () => {
    expect(() => validateMultiDefinition({ ...example(), name: '../escape' })).toThrow();
    expect(() => validateMultiDefinition({ ...example(), primaryTable: 'unknown' })).toThrow();
    expect(() => validateMultiDefinition({ ...example(), relations: [{
      fromTable: 'product_certifications', fromColumn: 'missing',
      toTable: 'managed_products', toColumn: 'id'
    }] })).toThrow();
    const duplicate = example();
    duplicate.tables.push(duplicate.tables[0]);
    expect(() => validateMultiDefinition(duplicate)).toThrow();
  });
});
