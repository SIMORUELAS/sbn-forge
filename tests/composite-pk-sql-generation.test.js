'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const GeneratorContextBuilder = require('../src/context/generator-context.builder');
const { TemplateEngine } = require('../src/core/template-engine');

const columns = [
  { name: 'agent_id', position: 1, dataType: 'uuid', nativeType: 'uuid', nullable: false },
  { name: 'role_id', position: 2, dataType: 'smallint', nativeType: 'smallint', nullable: false },
  { name: 'assigned_at', position: 3, dataType: 'timestamp', nativeType: 'timestamp', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
];

function build(seeds) {
  return new GeneratorContextBuilder().build({
    source: { type: 'postgresql' },
    schema: 'simo_ai',
    table: 'ai_agent_role_assignments',
    profile: 'sbn-api-v2',
    columns,
    primaryKey: { name: 'pk_agent_role', columns: ['agent_id', 'role_id'] },
    seeds
  });
}

describe('SQL composite primary key and seeds', () => {
  test('rejects a seed missing composite primary key columns', () => {
    expect(() => build([{ assigned_at: '2026-01-01' }])).toThrow(/agent_id/);
    expect(() => build([{ agent_id: '550e8400-e29b-41d4-a716-446655440000' }])).toThrow(/role_id/);
  });

  test('rejects NULL for required key columns', () => {
    expect(() => build([{ agent_id: null, role_id: 1 }])).toThrow(/agent_id/);
  });

  test('accepts both key columns and renders one composite SQL constraint', async () => {
    const context = build([{ agent_id: '550e8400-e29b-41d4-a716-446655440000', role_id: 1 }]);
    const engine = new TemplateEngine({ templatesDirectory: path.join(__dirname, '../src/templates') });
    const sql = await engine.render('database/migration.hbs', context);
    const seedSql = await engine.render('database/seeds.hbs', context);
    expect(sql).toContain('PRIMARY KEY (agent_id, role_id)');
    expect((sql.match(/PRIMARY KEY/g) || [])).toHaveLength(1);
    expect(seedSql).toContain('agent_id');
    expect(seedSql).toContain('role_id');
    expect(seedSql).not.toContain('VALUES\n(\n    NULL');
  });
});
