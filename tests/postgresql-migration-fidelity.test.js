'use strict';

const path = require('path');
const GeneratorContextBuilder = require('../src/context/generator-context.builder');
const { TemplateEngine } = require('../src/core/template-engine');

const columns = [
  { name: 'agent_id', nativeType: 'uuid', nullable: false },
  { name: 'role_id', nativeType: 'smallint', nullable: false },
  { name: 'created_from', nativeType: 'character varying', maxLength: 50, nullable: true },
  { name: 'updated_from', nativeType: 'character varying', maxLength: 50, nullable: true }
];

const foreignKeys = [
  { name: 'fk_agent', column: 'agent_id', referencedSchema: 'simo_ai', referencedTable: 'ai_agents', referencedColumn: 'id', onDelete: 'CASCADE', onUpdate: 'NO ACTION' },
  { name: 'fk_role', column: 'role_id', referencedSchema: 'simo_ai', referencedTable: 'ai_agent_roles', referencedColumn: 'id', onDelete: 'CASCADE', onUpdate: 'NO ACTION' },
  ...['created_by', 'updated_by', 'deleted_by'].map(column => ({
    name: 'fk_' + column,
    column,
    referencedSchema: 'public',
    referencedTable: 'users',
    referencedColumn: 'id',
    onDelete: 'SET NULL',
    onUpdate: 'NO ACTION'
  }))
];

describe('PostgreSQL migration type lengths and referential actions', () => {
  test('genera CHECK para enum CUSTOM, rango SMALLINT y conserva UUID nullable', async () => {
    const engine = new TemplateEngine({
      templatesDirectory: path.join(__dirname, '../src/templates')
    });
    const sql = await engine.render('database/migration.hbs', {
      database: { schema: 'simo_ai', table: 'forge_domain_test' },
      columns: [
        { name: 'id', nativeType: 'uuid', nullable: false },
        { name: 'branch_id', nativeType: 'uuid', nullable: true },
        { name: 'role_id', nativeType: 'smallint', nullable: false,
          jsonSchema: { minimum: 1, maximum: 32767 } },
        { name: 'permission_level', nativeType: 'varchar(20)', nullable: false,
          jsonSchema: { enum: ['VIEW', 'OPERATE', 'MANAGE', 'ADMIN', 'CUSTOM'] } }
      ],
      primaryKey: { columns: ['id'] },
      foreignKeys: []
    });
    expect(sql).toContain('CHECK (role_id >= 1)');
    expect(sql).toContain('CHECK (role_id <= 32767)');
    expect(sql).toContain("CHECK (permission_level IN ('VIEW', 'OPERATE', 'MANAGE', 'ADMIN', 'CUSTOM'))");
    expect(sql).toMatch(/branch_id uuid,/);
    expect(sql).not.toMatch(/branch_id uuid NOT NULL/);
  });

  test('preserves varchar(50), composite PK, and all five FK actions', async () => {
    const context = new GeneratorContextBuilder().build({
      source: { type: 'postgresql' },
      schema: 'simo_ai',
      table: 'ai_agent_role_assignments',
      profile: 'sbn-api-v2',
      columns: [
        ...columns,
        ...['created_by', 'updated_by', 'deleted_by'].map(name => ({
          name, nativeType: 'bigint', nullable: true
        }))
      ],
      primaryKey: { name: 'ai_agent_role_assignments_pkey', columns: ['agent_id', 'role_id'] },
      foreignKeys,
      seeds: []
    });
    const engine = new TemplateEngine({
      templatesDirectory: path.join(__dirname, '../src/templates')
    });
    const sql = await engine.render('database/migration.hbs', context);
    expect(sql).toMatch(/created_from\s+character varying\(50\)/i);
    expect(sql).toMatch(/updated_from\s+character varying\(50\)/i);
    expect(sql).toContain('PRIMARY KEY (agent_id, role_id)');
    expect((sql.match(/PRIMARY KEY/g) || [])).toHaveLength(1);
    expect((sql.match(/ON DELETE CASCADE/g) || [])).toHaveLength(2);
    expect((sql.match(/ON DELETE SET NULL/g) || [])).toHaveLength(3);
    expect((sql.match(/ON UPDATE NO ACTION/g) || [])).toHaveLength(5);
  });

  test('does not add referential actions when omitted', async () => {
    const context = new GeneratorContextBuilder().build({
      schema: 'simo_ai',
      table: 'ai_agent_role_assignments',
      profile: 'sbn-api-v2',
      columns: columns.slice(0, 2),
      primaryKey: { columns: ['agent_id', 'role_id'] },
      foreignKeys: [{ ...foreignKeys[0], onDelete: undefined, onUpdate: undefined }],
      seeds: []
    });
    const engine = new TemplateEngine({
      templatesDirectory: path.join(__dirname, '../src/templates')
    });
    const sql = await engine.render('database/migration.hbs', context);
    expect(sql).not.toContain('ON DELETE');
    expect(sql).not.toContain('ON UPDATE');
  });
});
