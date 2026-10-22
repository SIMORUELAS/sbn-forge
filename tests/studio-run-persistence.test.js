'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createRunManager } = require('../studio/run-manager');

test('recovers history, retains only owned runs and denies unknown files', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'studio-run-test-'));
  const root = path.join(parent, 'runs');
  const external = path.join(parent, 'external.txt');
  await fs.writeFile(external, 'do-not-delete');
  const definitionStore = { get: async name => ({ name }) };
  const generate = async (definition, options) => {
    const directory = await fs.mkdtemp(path.join(options.tempRoot, 'sbn-forge-studio-'));
    await fs.mkdir(path.join(directory, 'modules'));
    await fs.writeFile(path.join(directory, 'modules', 'README.md'), definition.name);
    return { name: definition.name, directory, mode: 'isolated-local', published: false,
      databaseModified: false, totals: { planned: 1, written: 1, published: 0 },
      artifacts: [{ path: 'modules/README.md', bytes: Buffer.byteLength(definition.name) }] };
  };
  try {
    const manager = createRunManager({ definitionStore, generate, directory: root, limit: 2 });
    const first = await manager.execute('one');
    const second = await manager.execute('two');
    const restored = createRunManager({ definitionStore, generate, directory: root, limit: 2 });
    expect((await restored.list()).map(item => item.id)).toEqual([second.id, first.id]);
    expect((await restored.read(first.id, 'modules/README.md')).content).toBe('one');
    await expect(restored.read(first.id, '../external.txt')).rejects.toMatchObject({ status: 400 });
    await expect(restored.read(first.id, 'modules/other.txt')).rejects.toMatchObject({ status: 400 });
    const third = await restored.execute('three');
    expect((await restored.list()).map(item => item.id)).toEqual([third.id, second.id]);
    await expect(restored.read(first.id, 'modules/README.md')).rejects.toMatchObject({ status: 404 });
    expect(await fs.readFile(external, 'utf8')).toBe('do-not-delete');
    await expect(fs.access(path.join(root, first.id))).rejects.toMatchObject({ code: 'ENOENT' });
  } finally { await fs.rm(parent, { recursive: true, force: true }); }
});
