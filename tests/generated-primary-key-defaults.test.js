'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Handlebars = require('handlebars');

function repository(context) {
  const template = fs.readFileSync(
    path.join(__dirname, '../src/templates/backend/repository.hbs'), 'utf8'
  );
  const module = { exports: {} };
  vm.runInNewContext(Handlebars.compile(template)({
    schema: 'public',
    table: 'forge_generated_pk',
    database: { schema: 'public', table: 'forge_generated_pk' },
    primaryKeyInfo: { columns: [{ name: 'id', generated: true }] },
    columns: [{ name: 'id' }],
    writableColumns: [],
    createColumns: [],
    listFilters: [],
    columnMap: {},
    capabilities: { softDelete: false, optimisticLock: false },
    ...context
  }), { module, exports: module.exports });
  return module.exports;
}

describe('generated primary keys and optional audit columns', () => {
  test('uses DEFAULT VALUES and RETURNING when there are no writable fields', async () => {
    const repo = repository();
    let captured;
    repo.configure({
      async query(sql, values) {
        captured = { sql, values };
        return { rows: [{ id: 42 }], rowCount: 1 };
      }
    });
    expect(await repo.create({})).toEqual({ id: 42 });
    expect(captured.sql).toMatch(/INSERT INTO public\.forge_generated_pk/);
    expect(captured.sql).toMatch(/DEFAULT VALUES/);
    expect(captured.sql).toMatch(/RETURNING \*/);
    expect(Array.from(captured.values)).toEqual([]);
  });

  test('generated PK with soft delete does not generate conflict target reactivation', async () => {
    const repo = repository({
      capabilities: { softDelete: true, optimisticLock: false },
      columnMap: { deleted_at: {} }
    });
    let sql;
    repo.configure({
      async query(statement) {
        sql = statement;
        return { rows: [{ id: 43, deleted_at: null }], rowCount: 1 };
      }
    });
    expect((await repo.create({})).id).toBe(43);
    expect(sql).not.toMatch(/ON CONFLICT/);
  });
  test('partial audit metadata uses only existing created_from and updated_by fields', async () => {
    const repo = repository({
      primaryKeyInfo: { columns: [{ name: 'id', generated: false }] },
      columns: [{ name: 'id' }, { name: 'created_from' }, { name: 'updated_by' }],
      columnMap: { created_from: {}, updated_by: {} }
    });
    const calls = [];
    repo.configure({
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [{ id: 7 }], rowCount: 1 };
      }
    });
    await repo.create({ id: 7 }, { source: 'test-origin', userId: 'user-1' });
    expect(calls[0].sql).toContain('created_from');
    expect(calls[0].sql).not.toContain('created_by');
    expect(Array.from(calls[0].values)).toEqual([7, 'test-origin']);
    await repo.update(7, {}, { userId: 'user-2' });
    expect(calls[1].sql).toContain('updated_by = $1');
    expect(calls[1].sql).not.toContain('updated_from');
    expect(Array.from(calls[1].values)).toEqual(['user-2', 7]);
  });

  test('optimistic version rejects stale updates through SQL predicate', async () => {
    const repo = repository({
      primaryKeyInfo: { columns: [{ name: 'id', generated: false }] },
      columns: [{ name: 'id' }, { name: 'version_no' }],
      capabilities: { softDelete: false, optimisticLock: true }
    });
    let version = 1;
    repo.configure({
      async query(sql, values) {
        const expected = values[values.length - 1];
        if (expected !== version) {
          return { rows: [], rowCount: 0 };
        }
        version = values[0];
        return { rows: [{ id: 7, version_no: version }], rowCount: 1 };
      }
    });
    expect((await repo.update(7, { expected_version_no: 1 })).version_no).toBe(2);
    expect(await repo.update(7, { expected_version_no: 1 })).toBeNull();
    expect(version).toBe(2);
  });

});
