'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Handlebars = require('handlebars');

const template = fs.readFileSync(
  path.join(__dirname, '../src/templates/backend/repository.hbs'),
  'utf8'
);

function repository() {
  const rendered = Handlebars.compile(template)({
    schema: 'simo_ai',
    table: 'ai_agent_role_assignments',
    database: { schema: 'simo_ai', table: 'ai_agent_role_assignments' },
    primaryKeyInfo: {
      columns: [
        { name: 'agent_id', generated: false },
        { name: 'role_id', generated: false }
      ]
    },
    columns: [{ name: 'agent_id' }, { name: 'role_id' }],
    writableColumns: [],
    listFilters: [{ name: 'agent_id' }],
    columnMap: {},
    capabilities: { softDelete: true, optimisticLock: false }
  });
  const module = { exports: {} };
  vm.runInNewContext(rendered, { module, exports: module.exports });
  return module.exports;
}

describe('generated PostgreSQL parameter bindings', () => {
  const agentId = '11111111-1111-4111-8111-111111111111';

  test('list with UUID filter binds WHERE, LIMIT and OFFSET in order', async () => {
    const repo = repository();
    const calls = [];
    repo.configure({
      query: async (sql, params) => {
        calls.push({ sql, params });
        return { rows: [], rowCount: 0 };
      }
    });
    await repo.list({ agent_id: agentId, limit: 10, offset: 20 });
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toMatch(/agent_id\s*=\s*\$1/);
    expect(calls[0].sql).toMatch(/LIMIT\s+\$2/);
    expect(calls[0].sql).toMatch(/OFFSET\s+\$3/);
    expect(Array.from(calls[0].params)).toEqual([agentId, 10, 20]);
  });

  test('list without filter binds only LIMIT and OFFSET', async () => {
    const repo = repository();
    let captured;
    repo.configure({
      query: async (sql, params) => {
        captured = { sql, params };
        return { rows: [], rowCount: 0 };
      }
    });
    await repo.list({ limit: 5, offset: 0 });
    expect(captured.sql).toMatch(/LIMIT\s+\$1/);
    expect(captured.sql).toMatch(/OFFSET\s+\$2/);
    expect(Array.from(captured.params)).toEqual([5, 0]);
  });

  test('composite UUID and SMALLINT key binds both values', async () => {
    const repo = repository();
    let captured;
    repo.configure({
      query: async (sql, params) => {
        captured = { sql, params };
        return { rows: [], rowCount: 0 };
      }
    });
    await repo.getById({ agent_id: agentId, role_id: 3 });
    expect(captured.sql).toMatch(/agent_id\s*=\s*\$1/);
    expect(captured.sql).toMatch(/role_id\s*=\s*\$2/);
    expect(Array.from(captured.params)).toEqual([agentId, 3]);
  });

  test('create binds both primary keys and preserves conflict target', async () => {
    const repo = repository();
    let captured;
    repo.configure({
      query: async (sql, params) => {
        captured = { sql, params };
        return { rows: [{ agent_id: agentId, role_id: 3 }], rowCount: 1 };
      }
    });
    await repo.create({ agent_id: agentId, role_id: 3 });
    expect(captured.sql).toMatch(/VALUES\s*\(\$1,\s*\$2\)/);
    expect(captured.sql).toMatch(/ON CONFLICT\s*\(agent_id, role_id\)/);
    expect(Array.from(captured.params)).toEqual([agentId, 3]);
  });

  test('soft delete binds both primary keys', async () => {
    const repo = repository();
    let captured;
    repo.configure({
      query: async (sql, params) => {
        captured = { sql, params };
        return { rows: [{}], rowCount: 1 };
      }
    });
    expect(await repo.remove({ agent_id: agentId, role_id: 3 })).toBe(true);
    expect(captured.sql).toMatch(/agent_id\s*=\s*\$1/);
    expect(captured.sql).toMatch(/role_id\s*=\s*\$2/);
    expect(Array.from(captured.params)).toEqual([agentId, 3]);
  });
});
