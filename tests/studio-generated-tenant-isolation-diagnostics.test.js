'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { inspectGeneratedSecurity } = require('../studio/generated-security-inspector');

describe('generated multi-tenant SQL isolation diagnostics', () => {
  test('unscoped repository remains uncertified even with organizationId references', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-tenant-check-'));
    const file = 'modules/example/example.repository.js';
    try {
      await fs.mkdir(path.join(root, 'modules/example'), { recursive: true });
      await fs.writeFile(path.join(root, file),
        'const organizationId = context.organizationId; async function list() { return db.query("SELECT * FROM example"); }');
      const checks = await inspectGeneratedSecurity(root, [{ path: file }]);
      const isolation = checks.find(item => item.check === 'generated-tenant-query-isolation');
      expect(isolation.status).toBe('unknown');
      expect(isolation.message).toMatch(/no certifica aislamiento multiempresa/i);
      const references = checks.find(item => item.check === 'generated-organization-contract');
      expect(references.status).toBe('unknown');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
