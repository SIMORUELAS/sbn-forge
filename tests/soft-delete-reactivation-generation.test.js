'use strict';

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const source = fs.readFileSync(path.join(__dirname, '../src/templates/backend/repository.hbs'), 'utf8');

function generate(keys, softDelete) {
  return Handlebars.compile(source)({
    schema: 'test',
    table: 'assignments',
    database: { schema: 'test', table: 'assignments' },
    primaryKeyInfo: { columns: keys.map(name => ({ name, generated: false })) },
    columns: keys.map(name => ({ name })),
    writableColumns: [],
    listFilters: [],
    columnMap: { deleted_by: {}, updated_at: {}, created_by: {}, created_from: {}, updated_by: {}, updated_from: {} },
    capabilities: { softDelete, optimisticLock: true }
  });
}

describe('soft delete primary key conflict generation', () => {
  test.each([['id'], ['agent_id', 'role_id']])('reactivates primary key %j', (...keys) => {
    const result = generate(keys, true);
    expect(result).toContain('ON CONFLICT (' + keys.join(', ') + ')');
    expect(result).toContain('deleted_at = NULL');
    expect(result).toContain('deleted_by = NULL');
    expect(result).toContain('deleted_at IS NOT NULL');
    expect(result).toContain('version_no = test.assignments.version_no + 1');
  });

  test('without soft delete preserves insert', () => {
    expect(generate(['id'], false)).not.toContain('ON CONFLICT');
  });
});
