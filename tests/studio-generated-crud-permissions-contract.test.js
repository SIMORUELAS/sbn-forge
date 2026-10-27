'use strict';
const fs = require('node:fs');
const path = require('node:path');
const template = fs.readFileSync(path.join(__dirname, '../src/templates/backend/routes.hbs'), 'utf8');
describe('generated CRUD authorization adapter contract', () => {
  test('requires an explicit trusted adapter when permission enforcement is enabled', () => {
    expect(template).toContain("options.requireCrudPermissions === true");
    expect(template).toContain("typeof authorizeOperation !== 'function'");
    expect(template).toContain("throw new Error('Se requiere options.authorizeOperation");
    expect(template).toContain("permitted !== true");
    expect(template).toContain("reply.code(403)");
    expect(template).toContain("reply.code(401)");
  });
  test.each(['list', 'read', 'create', 'update', 'delete'])('guards %s operation', operation => {
    expect(template).toContain("preHandler: permissionGuard('" + operation + "')");
  });
});
