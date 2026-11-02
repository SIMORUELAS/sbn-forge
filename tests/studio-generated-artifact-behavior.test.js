'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateIsolated } = require('../studio/isolated-generation');

const metadata = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const definition = {
  version: 1, name: 'artifact_behavior_test',
  source: { type: 'postgresql', schema: 'product_hub', table: 'artifact_behavior_test' },
  primaryKey: { name: 'artifact_behavior_test_pkey', columns: ['id'] },
  foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...metadata, defaultValue: 'gen_random_uuid()' },
    { name: 'organization_id', dataType: 'uuid', nullable: false, visible: true, editable: true, required: true, ...metadata },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...metadata }
  ]
};

test('generated repository enforces tenant predicates for CRUD and overrides tenant on create', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-artifact-behavior-'));
  let filename;
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    filename = path.join(run.directory, run.artifacts.find(item => item.path.endsWith('.repository.js')).path);
    const repository = require(filename);
    const calls = [];
    repository.configure({
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [], rowCount: 0 };
      }
    }, { tenantColumn: 'organization_id' });
    const context = { organizationId: 'org-a', userId: 'user-a' };
    await repository.list({}, context);
    await repository.getById('record-a', context);
    await repository.create({ name: 'example', organization_id: 'org-b' }, context);
    await repository.update('record-a', { name: 'updated', organization_id: 'org-b' }, context);
    await repository.remove('record-a', context);
    expect(calls).toHaveLength(5);
    for (const call of [calls[0], calls[1], calls[3], calls[4]]) {
      expect(call.sql).toMatch(new RegExp('organization_id\\s*=\\s*\\\\$\\d+'));
      expect(call.values).toContain('org-a');
      expect(call.values).not.toContain('org-b');
    }
    expect(calls[2].sql).toContain('organization_id');
    expect(calls[2].values).toContain('org-a');
    expect(calls[2].values).not.toContain('org-b');
    const count = calls.length;
    await expect(repository.list({}, {})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    await expect(repository.getById('record-a', {})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    await expect(repository.create({ name: 'x' }, {})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    await expect(repository.update('record-a', { name: 'x' }, {})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    await expect(repository.remove('record-a', {})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    expect(calls).toHaveLength(count);
  } finally {
    if (filename) {
      delete require.cache[filename];
    }
    await fs.rm(parent, { recursive: true, force: true });
  }
});
