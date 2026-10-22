'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateIsolated } = require('../studio/isolated-generation');

const definition = {
  version: 1, name: 'readme_test',
  source: { type: 'postgresql', schema: 'product_hub', table: 'readme_test' },
  primaryKey: { name: 'readme_test_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, defaultValue: 'gen_random_uuid()', identity: false, maxLength: null, precision: null, scale: null },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, defaultValue: null, identity: false, maxLength: null, precision: null, scale: null }
  ]
};

test('generic README reflects actual files and does not claim security or absent metadata', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-readme-test-'));
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    const readmePath = run.artifacts.find(item => item.path.endsWith('/README.md')).path;
    const readme = await fs.readFile(path.join(run.directory, readmePath), 'utf8');
    expect(run.totals.written).toBe(7);
    expect(readme).toContain('Sin configuración de seguridad explícita');
    expect(readme).toContain('el manifiesto es la fuente de verdad');
    expect(readme).toContain('readme-test.routes.js');
    expect(readme).not.toContain('API_EXAMPLES.md');
    expect(readme).not.toContain('DATA_DICTIONARY.md');
    expect(readme).not.toContain('Perfil | ``');
    expect(readme).not.toContain('JWT | ``');
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});
