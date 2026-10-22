'use strict';
const { toForgePreview } = require('../studio/forge-preview');

function example() {
  return {
    version: 1, name: 'product_development_projects',
    source: { type: 'postgresql', schema: 'product_hub', table: 'product_development_projects' },
    primaryKey: { name: 'pk_projects', columns: ['id'] },
    foreignKeys: [{ name: 'fk_product', column: 'managed_product_id', referencedSchema: 'product_hub', referencedTable: 'managed_products', referencedColumn: 'id' }],
    fields: [
      { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false },
      { name: 'managed_product_id', dataType: 'uuid', nullable: false, visible: true, editable: true, required: true },
      { name: 'created_at', dataType: 'timestamp with time zone', nullable: false, visible: false, editable: false, required: false }
    ]
  };
}
test('adapts a saved Studio definition and preserves foreign keys', () => {
  const result = toForgePreview(example());
  expect(result.compatible).toBe(true);
  expect(result.preview.schema).toBe('product_hub');
  expect(result.preview.columns[0]).toMatchObject({ primaryKey: true, writable: false });
  expect(result.preview.columns[1].foreignKey).toEqual({ schema: 'product_hub', table: 'managed_products', column: 'id' });
  expect(result.warnings).toContain(expect.stringContaining('no usar para generar migraciones'));
});
test('reports unsupported types without generating artifacts', () => {
  const definition = example();
  definition.fields[1].dataType = 'geography';
  const result = toForgePreview(definition);
  expect(result.compatible).toBe(false);
  expect(result.warnings.join(' ')).toContain('geography');
});
