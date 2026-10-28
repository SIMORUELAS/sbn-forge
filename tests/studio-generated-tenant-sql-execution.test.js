'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Handlebars = require('handlebars');
const template = fs.readFileSync(path.join(__dirname, '../src/templates/backend/repository.hbs'), 'utf8');
const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const key = { agent_id: '11111111-1111-4111-8111-111111111111', role_id: 3 };
function build({ softDelete = true, composite = true, tenantKey = false } = {}) {
  const keys = tenantKey ? [{ name: 'organization_id', generated: false }] :
    composite ? [{ name: 'agent_id', generated: false }, { name: 'role_id', generated: false }] :
      [{ name: 'agent_id', generated: false }];
  const columns = [...new Set([...keys.map(k => k.name), 'organization_id', 'label', 'deleted_at'])].map(name => ({ name }));
  const source = Handlebars.compile(template)({
    schema: 'test', table: 'records', database: { schema: 'test', table: 'records' },
    primaryKeyInfo: { columns: keys }, columns,
    writableColumns: columns.filter(c => c.name !== 'deleted_at'),
    listFilters: [{ name: 'label' }], columnMap: {},
    capabilities: { softDelete, optimisticLock: false }
  });
  const mod = { exports: {} };
  vm.runInNewContext(source, { module: mod, exports: mod.exports });
  const calls = [];
  mod.exports.configure({
    query: async (sql, params) => {
      calls.push({ sql, params: Array.from(params) });
      return { rows: [{ organization_id: a }], rowCount: 1 };
    }
  }, { tenantColumn: 'organization_id' });
  return { repository: mod.exports, calls };
}
describe('generated tenant SQL executed against recording database adapter', () => {
  test('list uses tenant predicate and correct parameter positions', async () => {
    const { repository, calls } = build();
    await repository.list({ label: 'ok', limit: 4, offset: 2 }, { organizationId: a });
    expect(calls[0].sql).toMatch(/organization_id = \$1/);
    expect(calls[0].sql).toMatch(/label = \$2/);
    expect(calls[0].params).toEqual([a, 'ok', 4, 2]);
  });
  test('composite-key read, update and soft delete constrain tenant', async () => {
    const { repository, calls } = build();
    const context = { organizationId: a };
    await repository.getById(key, context);
    await repository.update(key, { label: 'new', organization_id: b }, context);
    await repository.remove(key, context);
    expect(calls).toHaveLength(3);
    for (const call of calls) {
      expect(call.sql).toMatch(/agent_id = \$\d+/);
      expect(call.sql).toMatch(/role_id = \$\d+/);
      expect(call.sql).toMatch(/organization_id = \$\d+/);
      expect(call.params).toContain(a);
      expect(call.params).not.toContain(b);
    }
  });
  test('insert ignores forged tenant and reactivation is tenant constrained', async () => {
    const { repository, calls } = build();
    await repository.create({ ...key, label: 'new', organization_id: b }, { organizationId: a });
    expect(calls[0].params).toContain(a);
    expect(calls[0].params).not.toContain(b);
    expect(calls[0].sql).toContain('EXCLUDED.organization_id');
  });
  test('hard delete also scopes tenant', async () => {
    const { repository, calls } = build({ softDelete: false });
    await repository.remove(key, { organizationId: a });
    expect(calls[0].sql).toMatch(/DELETE FROM[\s\S]*organization_id = \$3/);
    expect(calls[0].params).toEqual([key.agent_id, key.role_id, a]);
  });
  test('tenant primary key cannot be overwritten by supplied input', async () => {
    const { repository, calls } = build({ tenantKey: true });
    await repository.create({ organization_id: b, label: 'x' }, { organizationId: a });
    expect(calls[0].params).toContain(a);
    expect(calls[0].params).not.toContain(b);
  });
  test('cross-tenant upsert collision returns explicit conflict rather than success with null', async () => {
    const { repository } = build();
    repository.configure({
      query: async () => ({ rows: [], rowCount: 0 })
    }, { tenantColumn: 'organization_id' });
    await expect(repository.create({ ...key, organization_id: b }, { organizationId: a }))
      .rejects.toMatchObject({ code: 'TENANT_CONFLICT', statusCode: 409 });
  });
  test('missing authenticated organization fails before querying', async () => {
    const { repository, calls } = build();
    await expect(repository.list({})).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    await expect(repository.create({ ...key })).rejects.toMatchObject({ code: 'TENANT_SCOPE_REQUIRED' });
    expect(calls).toHaveLength(0);
  });
});
