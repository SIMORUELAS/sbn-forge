'use strict';
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/templates/backend/routes.hbs'), 'utf8');
describe('generated tenant isolation installation guard', () => {
  test('rejects uncertified isolation explicitly before repository configuration', () => {
    const guard = source.indexOf('options.requireTenantIsolation === true');
    const rejection = source.indexOf('TENANT_ISOLATION_NOT_CERTIFIED');
    const configure = source.indexOf('repository.configure(');
    expect(guard).toBeGreaterThan(-1);
    expect(rejection).toBeGreaterThan(guard);
    expect(configure).toBeGreaterThan(rejection);
  });
});
