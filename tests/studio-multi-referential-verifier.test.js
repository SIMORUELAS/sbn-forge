'use strict';
const { verifyMultiReferentialEvidence } = require('../studio/multi-referential-verifier');
const col = name => ({ name, type: 'uuid', nullable: false });
function fixture() {
  const columns = [{ fromColumn: 'organization_id', toColumn: 'organization_id' },
    { fromColumn: 'product_id', toColumn: 'id' }];
  const input = { kind: 'studio.multitable.preview', version: 1, name: 'catalog',
    mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_test', schema: 'product_hub' },
    primaryTable: 'products', tables: [
      { name: 'products', columns: [col('id'), col('organization_id')], primaryKey: ['id'] },
      { name: 'items', columns: [col('id'), col('organization_id'), col('product_id')], primaryKey: ['id'] }
    ], relations: columns.map(pair => ({ fromTable: 'items', toTable: 'products', ...pair })),
    foreignKeyGroups: [{ name: 'fk_items_products', fromTable: 'items', toTable: 'products', columns }] };
  const rows = columns.map(pair => ({ constraint_name: 'fk_items_products',
    column_name: pair.fromColumn, referenced_column: pair.toColumn,
    referenced_schema: 'product_hub', referenced_table: 'products', validated: true,
    deferrable: false, initially_deferred: false, match_type: 's',
    update_rule: 'NO ACTION', delete_rule: 'RESTRICT' }));
  const metadata = Object.fromEntries(input.tables.map(table => [table.name,
    table.columns.map(column => ({ column_name: column.name, data_type: 'uuid',
      udt_name: 'uuid', is_nullable: 'NO' }))]));
  const reader = { readForeignKeys: jest.fn(async () => rows),
    readColumns: jest.fn(async (_schema, table) => metadata[table]),
    readPrimaryKey: jest.fn(async () => [{ column_name: 'id' }]),
    readUniqueConstraints: jest.fn(async () => [{ name: 'uq_org_id', columns: ['organization_id', 'id'] }]) };
  return { input, reader, rows, metadata };
}
test('matches catalog evidence without authorizing execution', async () => {
  const { input, reader } = fixture();
  const result = await verifyMultiReferentialEvidence(input, reader);
  expect(result.results[0]).toMatchObject({ status: 'catalog-match', targetKey: 'unique-constraint',
    tenantStatus: 'tenant-pair-present', typesMatch: true, mandatoryPairs: true, safeActions: true, certified: false });
  expect(reader.readForeignKeys).toHaveBeenCalledWith('product_hub', 'items');
  expect(result).toMatchObject({ generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false });
});
test.each([
  ['missing constraint', f => f.rows.pop(), 'catalog-mismatch'],
  ['changed target', f => { f.rows[0].referenced_column = 'id'; }, 'catalog-mismatch'],
  ['changed order', f => f.rows.reverse(), 'catalog-mismatch'],
  ['unvalidated', f => { f.rows[0].validated = false; }, 'catalog-policy-denied'],
  ['deferred', f => { f.rows[0].deferrable = true; }, 'catalog-policy-denied'],
  ['missing evidence', f => { delete f.rows[0].validated; }, 'catalog-policy-denied'],
  ['cascade', f => { f.rows[0].update_rule = 'CASCADE'; }, 'catalog-policy-denied'],
  ['nullable organization', f => { f.metadata.items[1].is_nullable = 'YES'; }, 'catalog-policy-denied'],
  ['nullable product', f => { f.metadata.items[2].is_nullable = 'YES'; }, 'catalog-policy-denied'],
  ['type mismatch', f => { f.metadata.items[2].udt_name = 'text'; }, 'catalog-policy-denied'],
  ['missing unique key', f => f.reader.readUniqueConstraints.mockResolvedValue([]), 'catalog-policy-denied']
])('rejects %s', async (_name, mutate, status) => {
  const f = fixture();
  f.input.foreignKeyGroups[0].evidence = { validated: true, certified: true };
  mutate(f);
  const result = await verifyMultiReferentialEvidence(f.input, f.reader);
  expect(result.results[0]).toMatchObject({ status, certified: false });
  expect(result.installationAuthorized).toBe(false);
});
test('propagates catalog query failures instead of granting authority', async () => {
  const { input, reader } = fixture();
  reader.readForeignKeys.mockRejectedValue(new Error('connection lost'));
  await expect(verifyMultiReferentialEvidence(input, reader)).rejects.toThrow('connection lost');
});
