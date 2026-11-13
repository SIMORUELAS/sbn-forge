'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('generated Portal HTTP tenant isolation executes in an isolated Node process', () => {
  const runner = path.join(__dirname, 'support', 'studio-generated-portal-tenant-http-runner.cjs');
  const result = spawnSync(process.execPath, [runner], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 60000,
    env: { ...process.env, NODE_ENV: 'test' }
  });
  expect(result.error).toBeUndefined();
  const diagnostic = String(result.stderr || '').slice(0, 1200);
  if (result.status !== 0) {
    throw new Error('PORTAL_TENANT_HTTP_RUNNER_EXIT_' + result.status + ': ' + diagnostic);
  }
  expect(result.stdout.trim()).toBe('PORTAL_TENANT_HTTP_OK');
}, 70000);
