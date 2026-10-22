'use strict';

const PostgresReader = require('../src/inspectors/postgresql/postgres-reader');

describe('PostgresReader composite foreign keys', () => {
  test('uses paired pg_constraint attnums instead of a cross-product join', async () => {
    const rows = [
      { constraint_name: 'fk_org_module', column_name: 'organization_id', referenced_schema: 'public', referenced_table: 'organization_modules', referenced_column: 'organization_id' },
      { constraint_name: 'fk_org_module', column_name: 'module_id', referenced_schema: 'public', referenced_table: 'organization_modules', referenced_column: 'module_id' }
    ];
    const datasource = { query: jest.fn().mockResolvedValue({ rows }) };
    const reader = new PostgresReader(datasource);
    await expect(reader.readForeignKeys('public', 'organization_user_modules')).resolves.toEqual(rows);
    const [sql, params] = datasource.query.mock.calls[0];
    expect(params).toEqual(['public', 'organization_user_modules']);
    expect(sql).toMatch(/unnest\(con\.conkey, con\.confkey\)/);
    expect(sql).toMatch(/WITH ORDINALITY/);
    expect(sql).toMatch(/key_columns\.source_number/);
    expect(sql).toMatch(/key_columns\.referenced_number/);
    expect(sql).not.toMatch(/constraint_column_usage/);
    expect(sql).toMatch(/ORDER BY con\.conname, key_columns\.position/);
  });
});
