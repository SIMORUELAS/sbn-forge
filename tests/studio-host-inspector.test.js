'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { inspectHost } = require('../studio/host-inspector');
test('host inspection reads declared dependencies without certifying integration', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-host-inspect-'));
  try {
    await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: { fastify: '^5.0.0', pg: '^8.0.0' } }));
    const result = await inspectHost(root);
    expect(result.configured).toBe(true);
    expect(result.checks.find(c => c.check === 'host-dependencies').message).toContain('fastify=^5.0.0');
    expect(result.checks.every(c => c.status === 'unknown')).toBe(true);
    expect((await inspectHost()).configured).toBe(false);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
