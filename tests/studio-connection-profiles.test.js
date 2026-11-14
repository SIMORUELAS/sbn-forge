'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createConnectionProfiles } = require('../studio/connection-profiles');

describe('encrypted PostgreSQL connection profiles', () => {
  let dir;
  let store;
  const profile = { name: 'local_test', host: '127.0.0.1', port: 5432,
    database: 'sbn_tenant_test', user: 'test_reader', password: 'do-not-expose-this' };
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-connection-test-'));
    store = createConnectionProfiles({
      file: path.join(dir, 'profiles.json'),
      env: { FORGE_STUDIO_CONNECTION_PROFILES: '1',
        FORGE_STUDIO_CONNECTION_KEY: crypto.randomBytes(32).toString('hex') }
    });
  });
  afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });
  test('saves encrypted profiles without leaking password through list', async () => {
    await store.upsert(profile);
    const raw = await fs.readFile(path.join(dir, 'profiles.json'), 'utf8');
    expect(raw).not.toContain(profile.password);
    expect(raw).not.toContain(profile.database);
    expect(await store.list()).toEqual([expect.objectContaining({
      name: 'local_test', mode: 'READ_ONLY', passwordConfigured: true
    })]);
    expect(JSON.stringify(await store.list())).not.toContain(profile.password);
  });
  test('edits without password and deletes', async () => {
    await store.upsert(profile);
    await store.upsert({ ...profile, database: 'other_test', password: '' }, 'local_test');
    expect((await store.get('local_test')).password).toBe(profile.password);
    expect((await store.get('local_test')).database).toBe('other_test');
    await store.remove('local_test');
    expect(await store.list()).toEqual([]);
  });
  test('rejects unallowlisted host and duplicate name', async () => {
    await expect(store.upsert({ ...profile, host: 'remote.example.com' }))
      .rejects.toThrow('INVALID_OR_UNAUTHORIZED_CONNECTION_PROFILE');
    await store.upsert(profile);
    await expect(store.upsert(profile)).rejects.toThrow('PROFILE_ALREADY_EXISTS');
  });
  test('does not permit storage without opt-in and encryption key', async () => {
    const disabled = createConnectionProfiles({ file: path.join(dir, 'disabled.json'), env: {} });
    expect(disabled.enabled).toBe(false);
    await expect(disabled.list()).rejects.toThrow('CONNECTION_PROFILE_STORAGE_NOT_CONFIGURED');
  });
});
