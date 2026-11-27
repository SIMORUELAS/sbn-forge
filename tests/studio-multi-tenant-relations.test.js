'use strict';
const { assessMultiCompatibility } = require('../studio/multi-compatibility-assessment');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
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

test.each([false, true])('referential deployment remains blocked paired=%s', paired => {
  const plan = createMultiGenerationPlan(fixture(paired));
  expect(plan.referentialPolicy.status).toBe('blocked');
  expect(plan.referentialPolicy.installationAuthorized).toBe(false);
  expect(plan.preparation.referentialPolicy).toEqual(plan.referentialPolicy);
  expect(plan.preparation.publicationAuthorized).toBe(false);
});

test('declared composite uniqueness is preserved but not certified', () => {
  const input = fixture(true);
  input.tables[0].uniqueConstraints = [{ name: 'uq_products_org_id', columns: ['organization_id', 'id'] }];
  const result = assessMultiCompatibility(input);
  expect(result.referentialEvidence[0]).toMatchObject({
    targetKey: 'declared-unique', uniqueConstraint: 'uq_products_org_id', typesMatch: true, certified: false
  });
  expect(result.installationAuthorized).toBe(false);
});
test('missing uniqueness and different column types remain unverified', () => {
  const input = fixture(true);
  input.tables[1].columns[2].type = 'text';
  expect(assessMultiCompatibility(input).referentialEvidence[0]).toMatchObject({
    targetKey: 'unverified', typesMatch: false, certified: false
  });
});
test('rejects unique constraints with duplicate columns', () => {
  const input = fixture(true);
  input.tables[0].uniqueConstraints = [{ name: 'uq_invalid', columns: ['id', 'id'] }];
  expect(() => assessMultiCompatibility(input)).toThrow('Restricciones UNIQUE inválidas');
});

test('adapter preserves composite relation as one non-executable contract', () => {
  const input = fixture(true);
  input.tables[0].uniqueConstraints = [{ name: 'uq_products_org_id', columns: ['organization_id', 'id'] }];
  const plan = createMultiGenerationPlan(input);
  const resource = plan.adapter.resources.find(item => item.table === 'items');
  expect(resource.compositeRelations).toEqual([expect.objectContaining({
    name: 'fk_items_products', targetSchema: 'product_hub', targetTable: 'products',
    columns: input.foreignKeyGroups[0].columns,
    evidence: expect.objectContaining({ targetKey: 'declared-unique', certified: false }),
    executable: false
  })]);
  expect(resource.compatible).toBe(false);
  expect(plan.preparation.installationAuthorized).toBe(false);
});

test('bridge and preparation retain composite evidence without enabling execution', () => {
  const input = fixture(true);
  input.tables[0].uniqueConstraints = [{ name: 'uq_products_org_id', columns: ['organization_id', 'id'] }];
  const plan = createMultiGenerationPlan(input);
  const resource = plan.bridge.resources.find(item => item.table === 'items');
  expect(resource.compositeRelations).toEqual(plan.adapter.resources.find(item => item.table === 'items').compositeRelations);
  expect(resource.contextPrepared).toBe(false);
  expect(resource.referentialReview).toMatchObject({ executable: false,
    definitionHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    compositeRelations: [{ name: 'fk_items_products', targetSchema: 'product_hub',
      targetTable: 'products', columns: input.foreignKeyGroups[0].columns }] });
  expect(plan.preparation.referentialEvidence).toEqual(plan.compatibility.referentialEvidence);
  const changed = fixture(true);
  expect(createMultiGenerationPlan(changed).preparation.fingerprint).not.toBe(plan.preparation.fingerprint);
});

describe('core composite relation generation guard', () => {
  const { validateDefinition } = require('../src/core/definition-validator');
  const { createGeneratorContext } = require('../src/core/generator-context');
  const definition = () => ({
    schema: 'product_hub', table: 'items',
    columns: [{ name: 'id', type: 'uuid', primaryKey: true },
      { name: 'organization_id', type: 'uuid' }, { name: 'product_id', type: 'uuid' }],
    compositeRelations: [{ name: 'fk_items_products', targetSchema: 'product_hub',
      targetTable: 'products', columns: [{ fromColumn: 'organization_id', toColumn: 'organization_id' },
        { fromColumn: 'product_id', toColumn: 'id' }] }]
  });
  test('rejects even structurally valid composite contracts before creating executable context', () => {
    expect(() => createGeneratorContext(definition())).toThrow('relaciones compuestas aún no admitidas');
  });
  test('review context preserves ordered pairs without execution authority', () => {
    const input = definition();
    const context = createGeneratorContext(input, { reviewOnly: true });
    expect(context).toMatchObject({ reviewOnly: true, executable: false,
      compositeRelations: input.compositeRelations });
    input.compositeRelations[0].columns.reverse();
    expect(context.compositeRelations[0].columns[0].fromColumn).toBe('organization_id');
    expect(createGeneratorContext(input, { reviewOnly: true }).source.definitionHash)
      .not.toBe(context.source.definitionHash);
  });
  test('review mode still rejects invalid source columns', () => {
    const input = definition();
    input.compositeRelations[0].columns[0].fromColumn = 'missing';
    expect(() => createGeneratorContext(input, { reviewOnly: true })).toThrow('columnas de relación compuesta inválidas');
  });
  test('rejects unknown source columns', () => {
    const input = definition();
    input.compositeRelations[0].columns[0].fromColumn = 'missing';
    expect(() => validateDefinition(input)).toThrow('columnas de relación compuesta inválidas');
  });
  test('rejects repeated target columns', () => {
    const input = definition();
    input.compositeRelations[0].columns[0].toColumn = 'id';
    expect(() => validateDefinition(input)).toThrow('columnas de relación compuesta duplicadas');
  });
  test('rejects duplicate relation names', () => {
    const input = definition();
    input.compositeRelations.push(input.compositeRelations[0]);
    expect(() => validateDefinition(input)).toThrow('relación compuesta duplicada');
  });
  test('preserves compatibility for definitions without composite relations', () => {
    const input = definition();
    input.compositeRelations = [];
    expect(validateDefinition(input)).toBe(true);
    delete input.compositeRelations;
    expect(validateDefinition(input)).toBe(true);
  });
});

test.each([
  [{ validated: false }, 'not-validated'],
  [{ validated: true, deferrable: true }, 'deferred'],
  [{ validated: true }, 'unknown'],
  [{ validated: true, deferrable: false, initiallyDeferred: false, matchType: 'p' }, 'unsupported-match'],
  [{ validated: true, deferrable: false, initiallyDeferred: false, matchType: 's' }, 'declared-compatible']
])('classifies declared evidence %j without granting authority', (evidence, status) => {
  const input = fixture(true);
  input.foreignKeyGroups[0].evidence = { ...evidence, certified: true };
  const result = assessMultiCompatibility(input);
  expect(result.referentialEvidence[0]).toMatchObject({ constraintStatus: status, certified: false });
  expect(result.installationAuthorized).toBe(false);
  expect(result.generationAuthorized).toBe(false);
});
