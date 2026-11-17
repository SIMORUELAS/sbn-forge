'use strict';
const { createMultiArtifactInventory } = require('../studio/multi-artifact-inventory');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const sample = () => ({ kind: 'studio.multitable.preview', version: 1, name: 'catalog',
  mode: 'READ_ONLY_PREVIEW', source: { profile: 'pg_sbntest', schema: 'product_hub' },
  primaryTable: 'products',
  tables: [{ name: 'products', primaryKey: ['id'], columns: [{ name: 'id', type: 'uuid',
    nullable: false, defaultValue: null, maxLength: null, precision: null, scale: null,
    identity: false, identityGeneration: null }],
    settings: { resourceEnabled: true, formEnabled: true, permissions: ['read'] } }],
  relations: [], foreignKeyGroups: [] });
test('inventories real templates without executing or writing artifacts', () => {
  const input = sample();
  const inventory = createMultiArtifactInventory(input);
  expect(inventory.artifacts).toHaveLength(7);
  expect(inventory.artifacts.find(item => item.kind === 'routes')).toMatchObject({
    template: 'backend/routes.hbs', path: 'products/products.routes.js',
    action: 'inventory-only', written: false, published: false });
  expect(inventory.artifacts.find(item => item.kind === 'manifest').template).toBeNull();
  expect(inventory.warnings.join(' ')).toContain('formulario sin plantilla');
  expect(inventory).toMatchObject({ executable: false, readyForGeneration: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false,
    totals: { resources: 1, catalogArtifacts: 7, written: 0, published: 0 } });
  expect(createMultiGenerationPlan(input).inventory).toEqual(inventory);
});
test('does not inventory disabled resources', () => {
  const input = sample();
  input.tables[0].settings.resourceEnabled = false;
  const inventory = createMultiArtifactInventory(input);
  expect(inventory.artifacts).toHaveLength(0);
  expect(inventory.totals.resources).toBe(0);
});
test('records composite FK dependencies and blocks unsupported operations', () => {
  const input = sample();
  input.tables.push({ name: 'assignments', primaryKey: ['a', 'b'],
    columns: ['a', 'b'].map(name => ({ name, type: 'uuid', nullable: false })),
    settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } });
  input.relations = [{ fromTable: 'assignments', fromColumn: 'a', toTable: 'products', toColumn: 'id' }];
  input.foreignKeyGroups = [{ name: 'fk_assignments', fromTable: 'assignments',
    toTable: 'products', columns: [{ fromColumn: 'a', toColumn: 'id' }] }];
  const inventory = createMultiArtifactInventory(input);
  expect(inventory.resources.find(item => item.table === 'assignments').dependencies).toHaveLength(1);
  expect(inventory.blockers.join(' ')).toContain('Clave primaria compuesta');
  expect(inventory.artifacts).toHaveLength(14);
});
