'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { collectSourceEvidence } = require('../studio/host-static-evidence');
test('collects bounded source references without following links or executing code', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-evidence-'));
  try {
    await fs.mkdir(path.join(root, 'src'));
    await fs.writeFile(path.join(root, 'src', 'routes.js'),
      "fastify.get('/api/demo', handler); const organizationId = req.organizationId; jwtVerify(token); requireRole('admin');");
    await fs.writeFile(path.join(root, 'src', 'migration.ts'), 'const sql = "CREATE TABLE demo(id int)";');
    const result = await collectSourceEvidence(root);
    expect(result.routes).toContain('src/routes.js');
    expect(result.authentication).toContain('src/routes.js');
    expect(result.authorization).toContain('src/routes.js');
    expect(result.organization).toContain('src/routes.js');
    expect(result.migrations).toContain('src/migration.ts');
    expect(result.scanned).toBe(2);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
