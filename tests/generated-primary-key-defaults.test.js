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
});
