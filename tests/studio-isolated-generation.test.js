'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateIsolated } = require('../studio/isolated-generation');

const metadata = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const definition = {
  version: 1, name: 'sample_module',
  source: { type: 'postgresql', schema: 'product_hub', table: 'managed_products' },
  primaryKey: { name: 'managed_products_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...metadata, defaultValue: 'gen_random_uuid()' },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...metadata }
  ]
};
test('generates and verifies real artifacts in a unique temporary directory', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-isolation-test-'));
  let result;
  try {
    result = await generateIsolated(definition, { tempRoot: parent });
    expect(result.mode).toBe('isolated-local');
    expect(result.totals).toEqual({ planned: 7, written: 7, published: 0 });
    expect(result.artifacts).toHaveLength(7);
    expect(result.directory.startsWith(parent + path.sep)).toBe(true);
    const routeArtifact = result.artifacts.find(item => item.path.endsWith('.routes.js'));
    expect(routeArtifact).toBeDefined();
    const routeSource = await fs.readFile(path.join(result.directory, routeArtifact.path), 'utf8');
    expect(routeSource).toContain("fastify.addHook('onRequest', requireAuth)");
    expect(routeSource).toContain('await request.jwtVerify()');
    for (const artifact of result.artifacts) {
      expect((await fs.stat(path.join(result.directory, artifact.path))).isFile()).toBe(true);
    }
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});
test('refuses incomplete legacy metadata before writing anything', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-isolation-blocked-'));
  try {
    const invalid = JSON.parse(JSON.stringify(definition));
    delete invalid.fields[0].defaultValue;
    await expect(generateIsolated(invalid, { tempRoot: parent })).rejects.toThrow('Generación bloqueada');
    expect(await fs.readdir(parent)).toEqual([]);
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});
