'use strict';
const { assessMultiCompatibility } = require('../studio/multi-compatibility-assessment');
const col = name => ({ name, type: 'uuid', nullable: false, defaultValue: null,
  maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null });
function fixture(paired) {
  const columns = [{ fromColumn: 'product_id', toColumn: 'id' }];
  if (paired) {
    columns.push({ fromColumn: 'organization_id', toColumn: 'organization_id' });
  }
  return { kind: 'studio.multitable.preview', version: 1, name: 'catalog', mode: 'READ_ONLY_PREVIEW',
    source: { profile: 'pg_test', schema: 'product_hub' }, primaryTable: 'products',
    tables: [
      { name: 'products', columns: [col('id'), col('organization_id')], primaryKey: ['id'],
        settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } },
      { name: 'items', columns: [col('id'), col('organization_id'), col('product_id')], primaryKey: ['id'],
        settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } }
    ],
    relations: columns.map(pair => ({ fromTable: 'items', toTable: 'products', ...pair })),
    foreignKeyGroups: [{ name: 'fk_items_products', fromTable: 'items', toTable: 'products', columns }]
  };
}
test.each([[false, 'tenant-key-missing'], [true, 'tenant-pair-present']])(
  'tenant relation diagnostic paired=%s', (paired, status) => {
    const result = assessMultiCompatibility(fixture(paired));
    expect(result.tenantRelations).toEqual([{ name: 'fk_items_products', fromTable: 'items',
      toTable: 'products', status, certified: false }]);
    expect(result.tenantIntegrityCertified).toBe(false);
    expect(result.installationAuthorized).toBe(false);
  });
