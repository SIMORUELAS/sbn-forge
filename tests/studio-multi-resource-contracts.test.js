'use strict';
const { createMultiResourceContracts, mapType } = require('../studio/multi-resource-contracts');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
function definition() {
  return { kind: 'studio.multitable.preview', version: 1, name: 'products',
    mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_sbntest', schema: 'product_hub' },
    primaryTable: null,
    tables: [
      { name: 'managed_products', columns: [
        { name: 'id', type: 'uuid', nullable: false },
        { name: 'name', type: 'text', nullable: false }],
      primaryKey: ['id'], settings: { label: 'Productos', permissions: ['read', 'create'] } },
      { name: 'product_certifications', columns: [
        { name: 'product_id', type: 'uuid', nullable: false },
        { name: 'certification_id', type: 'uuid', nullable: false }],
      primaryKey: ['product_id', 'certification_id'] }
    ],
    relations: [{ fromTable: 'product_certifications', fromColumn: 'product_id',
      toTable: 'managed_products', toColumn: 'id' }] };
}
test('normalizes all resources with composite keys and relations, without authorizing execution', () => {
  const result = createMultiResourceContracts(definition());
  expect(result).toMatchObject({ readyForGeneration: false, executable: false,
    totals: { tables: 2, enabled: 2 } });
  expect(result.contracts[0].fields[0]).toMatchObject({ type: 'uuid', editable: false, protected: true });
  expect(result.contracts[1].keyStrategy).toBe('composite');
  expect(result.contracts[1].relations[0].targetKey).toBe(true);
  expect(result.contracts[0].permissions).toEqual(['read', 'create']);
  expect(result.blockers.join(' ')).toContain('Metadatos incompletos');
  const plan = createMultiGenerationPlan(definition());
  expect(plan.resourceContracts).toHaveLength(2);
  expect(plan.executable).toBe(false);
  expect(plan.totals.written).toBe(0);
  expect(createMultiResourceContracts(definition())).toEqual(result);
});
test('unknown PostgreSQL types fail closed', () => {
  const value = definition();
  value.tables[0].columns[1].type = 'geography(Point,4326)';
  const result = createMultiResourceContracts(value);
  expect(result.blockers.join(' ')).toContain('tipo PostgreSQL no soportado');
  expect(result.contracts[0].fields[1].type).toBe('unsupported');
  expect(mapType('numeric(12,2)')).toBe('number');
});
