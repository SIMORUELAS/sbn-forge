'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('two generated Fastify resources reject unauthenticated and unauthorized CRUD before SQL', () => {
  const runner = path.join(__dirname, 'support', 'studio-multi-generated-fastify-runner.cjs');
  const result = spawnSync(process.execPath, [runner], {
    cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 60000,
    env: { ...process.env, NODE_ENV: 'test' }
  });
  expect(result.error).toBeUndefined();
  const diagnostics = String(result.stderr || '')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/(password|secret|token)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
    .slice(0, 1200);
  if (result.status !== 0) {
    throw new Error('MULTITABLE_HTTP_EXIT_' + result.status + ': ' + diagnostics);
  }
  expect(JSON.parse(result.stdout.trim())).toEqual({
    resources: 2, generatedFiles: 14, operations: 10,
    missingJwtRejected: 10, unauthorizedRejected: 10, queries: 0
  });
}, 70000);
