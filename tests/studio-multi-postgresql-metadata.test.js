'use strict';
const { validateMultiDefinition } = require('../studio/multi-definition-store');
const { createMultiResourceContracts } = require('../studio/multi-resource-contracts');
function definition() {
  return { kind: 'studio.multitable.preview', version: 1, name: 'product_module',
    mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_sbntest', schema: 'product_hub' },
    primaryTable: null,
    tables: [
      { name: 'products', primaryKey: ['id'], columns: [
        { name: 'id', type: 'uuid', nullable: false, defaultValue: 'gen_random_uuid()',
          maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null },
        { name: 'name', type: 'text', nullable: false, defaultValue: null,
          maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null }] },
      { name: 'assignments', primaryKey: ['product_id', 'category_id'], columns: [
        { name: 'product_id', type: 'uuid', nullable: false, defaultValue: null,
          maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null },
        { name: 'category_id', type: 'uuid', nullable: false, defaultValue: null,
          maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null }] }
    ],
    relations: [{ fromTable: 'assignments', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' }],
    foreignKeyGroups: [{ name: 'fk_assignment_product', fromTable: 'assignments', toTable: 'products',
      columns: [{ fromColumn: 'product_id', toColumn: 'id' }] }] };
}
test('round-trips PostgreSQL metadata and FK grouping without granting execution', () => {
  const normalized = validateMultiDefinition(definition());
  expect(normalized.tables[0].columns[0].defaultValue).toBe('gen_random_uuid()');
  expect(normalized.foreignKeyGroups[0].columns).toHaveLength(1);
  const contracts = createMultiResourceContracts(normalized);
  expect(contracts.contracts[0].fields[0]).toMatchObject({
    metadataComplete: true, defaultValue: 'gen_random_uuid()', identity: false
  });
  expect(contracts.contracts[1].foreignKeyGroups).toHaveLength(1);
  expect(contracts.readyForGeneration).toBe(false);
  expect(contracts.executable).toBe(false);
  expect(contracts.generationAuthorized).toBe(false);
});
test('rejects malformed metadata and FK groupings', () => {
  const badDefault = definition();
  badDefault.tables[0].columns[0].defaultValue = { sql: 'unsafe' };
  expect(() => validateMultiDefinition(badDefault)).toThrow();
  const badGroup = definition();
  badGroup.foreignKeyGroups[0].columns[0].toColumn = 'missing';
  expect(() => validateMultiDefinition(badGroup)).toThrow();
  const badShape = definition();
  badShape.foreignKeyGroups = {};
  expect(() => validateMultiDefinition(badShape)).toThrow();
});
