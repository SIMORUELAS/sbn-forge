'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createDefinitionStore, validateDefinition } = require('../studio/definition-store');

const example = () => ({
  version: 1, name: 'product_development_projects',
  source: { type: 'postgresql', schema: 'product_hub', table: 'product_development_projects' },
  primaryKey: { name: 'product_development_projects_pkey', columns: ['id'] },
  foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false },
    { name: 'external_project_ref', dataType: 'text', nullable: false, visible: true, editable: true, required: true },
    { name: 'created_at', dataType: 'timestamp with time zone', nullable: false, visible: false, editable: false, required: false }
  ]
});

describe('Studio private definition storage', () => {
  let dir;
  beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-studio-definitions-')); });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

  test('saves, lists, reopens and updates definitions', async () => {
    const store = createDefinitionStore(dir);
    await store.save(example());
    expect(await store.list()).toEqual(['product_development_projects']);
    const saved = await store.get('product_development_projects');
    expect(saved.fields).toHaveLength(3);
    saved.fields[1].required = false;
    await store.save(saved);
    expect((await store.get(saved.name)).fields[1].required).toBe(false);
  });

  test('rejects traversal and invalid field states', async () => {
    const store = createDefinitionStore(dir);
    await expect(store.get('../outside')).rejects.toThrow('Nombre de módulo inválido');
    const invalid = example();
    invalid.fields[0].editable = true;
    expect(() => validateDefinition(invalid)).toThrow('protegido');
    invalid.fields[0].editable = false;
    invalid.fields[1].visible = false;
    expect(() => validateDefinition(invalid)).toThrow('obligatorio');
    invalid.fields[1].visible = true;
    invalid.fields.push({ ...invalid.fields[1] });
    expect(() => validateDefinition(invalid)).toThrow('duplicado');
  });
});
