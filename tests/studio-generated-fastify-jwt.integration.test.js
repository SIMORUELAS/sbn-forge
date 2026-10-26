'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');

describe('generated CRUD with real Fastify 5 and @fastify/jwt 10', () => {
  test('isolated Node integration verifies five CRUD routes and JWT scenarios', () => {
    const runner = path.join(__dirname, 'support', 'studio-fastify-jwt-runner.cjs');
    const result = spawnSync(process.execPath, [runner], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout.trim());
    expect(report).toEqual({
      operations: 5, missingJwtRejected: 5, invalidJwtRejected: 5,
      validJwtAccepted: 5, missingPluginRejected: 5, controllerCallsOnRejection: 0
    });
  }, 70000);
});
