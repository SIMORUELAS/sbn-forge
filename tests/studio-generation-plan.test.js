'use strict';
const { createGenerationPlan } = require('../studio/generation-plan');
function definition() {
  const metadata = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
  return {
    version: 1, name: 'sample_module',
    source: { type: 'postgresql', schema: 'product_hub', table: 'managed_products' },
    primaryKey: { name: 'pk_managed_products', columns: ['id'] },
    foreignKeys: [],
    fields: [
      { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...metadata, defaultValue: 'gen_random_uuid()' },
      { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...metadata }
    ]
  };
}
test('creates a deterministic read-only plan without writing artifacts', () => {
  const plan = createGenerationPlan(definition());
  expect(plan).toMatchObject({
    name: 'sample_module', compatible: true, readyForGeneration: true,
    executable: false, mode: 'plan-only', totals: { planned: 7, written: 0, published: 0 }
  });
  expect(plan.artifacts).toHaveLength(7);
  expect(plan.artifacts.map(item => item.kind)).toEqual(['routes', 'controller', 'service', 'repository', 'schema', 'readme', 'manifest']);
  expect(plan.engine.api).toBe('generateApi');
  expect(plan.integrations[0].status).toBe('not-mapped');
  expect(plan.artifacts.every(item => item.action === 'planned')).toBe(true);
  expect(createGenerationPlan(definition())).toEqual(plan);
});
test('shows blockers but never executes for legacy definitions', () => {
  const legacy = definition();
  delete legacy.fields[0].defaultValue;
  const plan = createGenerationPlan(legacy);
  expect(plan.compatible).toBe(true);
  expect(plan.readyForGeneration).toBe(false);
  expect(plan.blockers.join(' ')).toContain('Metadatos originales incompletos');
  expect(plan.totals.written).toBe(0);
});
