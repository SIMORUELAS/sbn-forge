'use strict';
const fs = require('node:fs');
const path = require('node:path');
const repository = fs.readFileSync(path.join(__dirname, '../src/templates/backend/repository.hbs'), 'utf8');
const routes = fs.readFileSync(path.join(__dirname, '../src/templates/backend/routes.hbs'), 'utf8');
describe('generated direct-column tenant SQL contract', () => {
  test('all five CRUD operations apply or derive tenant scope', () => {
    expect(repository).toMatch(/async function list\(query = \{\}, context = \{\}\)/);
    expect(repository).toMatch(/async function getById\(id, context = \{\}\)/);
    expect((repository.match(/tenantPredicate\(context, /g) || []).length).toBeGreaterThanOrEqual(6);
    expect(repository).toContain('data[tenantColumn] = scopeValues[0]');
    expect(repository).toContain('if (tenantColumn) delete data[tenantColumn]');
    expect(repository).toContain('EXCLUDED.${tenantColumn}');
    expect(repository).toContain('TENANT_SCOPE_REQUIRED');
    expect(repository).toContain('TENANT_COLUMN_NOT_FOUND');
  });
  test('tenant scoping requires verified JWT and host CRUD permissions', () => {
    expect(routes).toContain('TENANT_ISOLATION_NOT_CERTIFIED');
    expect(routes).toContain('TENANT_AUTHORIZATION_REQUIRED');
    expect(routes).toContain('TENANT_JWT_VERIFICATION_REQUIRED');
    expect(routes).toContain('repository.configure(database, { tenantColumn })');
  });
});
