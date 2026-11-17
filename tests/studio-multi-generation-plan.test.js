'use strict';
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const { validateMultiDefinition } = require('../studio/multi-definition-store');
const sample = () => ({
  kind: 'studio.multitable.preview', version: 1, name: 'product_hub_module',
  mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_sbntest', schema: 'product_hub' },
  primaryTable: null,
  tables: [
    { name: 'managed_products', columns: [{ name: 'id', type: 'uuid', nullable: false }],
      primaryKey: ['id'], settings: { label: 'Productos', resourceEnabled: true,
        formEnabled: true, permissions: ['read', 'create'] },
      fieldSettings: { id: { visible: true, editable: false, required: false } } },
    { name: 'product_category_assignments',
      columns: [{ name: 'managed_product_id', type: 'uuid', nullable: false },
        { name: 'category_id', type: 'uuid', nullable: false }],
      primaryKey: ['managed_product_id', 'category_id'],
      settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } }
  ],
  relations: [{ fromTable: 'product_category_assignments', fromColumn: 'managed_product_id',
    toTable: 'managed_products', toColumn: 'id' }]
});
test('creates a deterministic plan covering all selected tables, composite keys and relations', () => {
  const plan = createMultiGenerationPlan(sample());
  expect(plan).toMatchObject({ mode: 'plan-only', executable: false, readyForGeneration: false,
    totals: { tables: 2, resources: 2, proposed: 15, written: 0, published: 0 } });
  expect(plan.resources.map(resource => resource.table)).toEqual(['managed_products', 'product_category_assignments']);
  expect(plan.resources[0].permissions).toEqual(['read', 'create']);
  expect(plan.resources[0].fields[0]).toMatchObject({ protected: true, editable: false });
  expect(plan.relations).toHaveLength(1);
  expect(plan.warnings.join(' ')).toContain('clave primaria compuesta');
  expect(plan.blockers.join(' ')).toContain('Metadatos incompletos');
  expect(plan.blockers.join(' ')).toContain('no están conectados al generador ejecutable Forge');
  expect(plan.resourceContracts).toHaveLength(2);
  expect(plan.resourceContracts.every(contract => contract.executable === false)).toBe(true);
  expect(plan.generationAuthorized).toBe(false);
  expect(plan.installationAuthorized).toBe(false);
  expect(plan.publicationAuthorized).toBe(false);
  expect(createMultiGenerationPlan(sample())).toEqual(plan);
});
test('does not propose artifacts for disabled resources', () => {
  const definition = sample();
  definition.tables[1].settings.resourceEnabled = false;
  const plan = createMultiGenerationPlan(definition);
  expect(plan.totals.resources).toBe(1);
  expect(plan.totals.proposed).toBe(8);
  expect(plan.warnings.join(' ')).toContain('recurso deshabilitado');
});
test('rejects unsafe field configuration before planning', () => {
  const definition = sample();
  definition.tables[0].fieldSettings.id.editable = true;
  expect(() => validateMultiDefinition(definition)).toThrow();
  expect(() => createMultiGenerationPlan(definition)).toThrow();
});
