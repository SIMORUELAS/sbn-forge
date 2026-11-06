'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('real generated Fastify routes reject missing JWT and unauthorized CRUD before database access', () => {
  const runner = path.join(__dirname, 'support', 'studio-generated-artifact-fastify-runner.cjs');
  const result = spawnSync(process.execPath, [runner], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, NODE_ENV: 'test' }
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout.trim())).toEqual({
    operations: 5, missingJwtRejected: 5, unauthorizedRejected: 5, queryCount: 0
  });
}, 70000);
