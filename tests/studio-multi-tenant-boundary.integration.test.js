'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('generated resources return not found for tenant-scoped missing records', () => {
  const runner = path.join(__dirname, 'support', 'studio-multi-generated-fastify-runner.cjs');
  const result = spawnSync(process.execPath, [runner, '--tenant-boundary'], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 60000,
    env: { ...process.env, NODE_ENV: 'test' }
  });
  expect(result.error).toBeUndefined();
  if (result.status !== 0) {
    throw new Error(String(result.stderr).slice(0, 1200));
  }
  expect(JSON.parse(result.stdout.trim())).toEqual({
    rejected: 6, deniedQueries: 0, queries: 8
  });
}, 70000);
