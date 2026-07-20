'use strict';
const VALID_TYPES = new Set(['bigint','integer','smallint','uuid','boolean','varchar','character varying','text','json','jsonb','timestamp','timestamp without time zone','date','numeric','decimal']);
function assert(condition, message) { if (!condition) {throw new Error(`Definición inválida: ${message}`);} }
function validateDefinition(definition) {
  assert(definition && typeof definition === 'object' && !Array.isArray(definition), 'debe ser un objeto.');
  assert(typeof definition.schema === 'string' && definition.schema.trim(), 'schema es obligatorio.');
  assert(typeof definition.table === 'string' && /^[a-z][a-z0-9_]*$/.test(definition.table), 'table debe usar snake_case minúsculo.');
  assert(Array.isArray(definition.columns) && definition.columns.length > 0, 'columns debe ser un arreglo no vacío.');
  const names = new Set();
  for (const [index, column] of definition.columns.entries()) {
    assert(column && typeof column === 'object', `columns[${index}] debe ser objeto.`);
    assert(typeof column.name === 'string' && /^[a-z][a-z0-9_]*$/.test(column.name), `columns[${index}].name inválido.`);
    assert(!names.has(column.name), `columna duplicada: ${column.name}.`); names.add(column.name);
    assert(typeof column.type === 'string' && VALID_TYPES.has(column.type.toLowerCase()), `tipo no soportado para ${column.name}: ${column.type}.`);
    if (column.primaryKey !== undefined) {assert(typeof column.primaryKey === 'boolean', `${column.name}.primaryKey debe ser boolean.`);}
    if (column.nullable !== undefined) {assert(typeof column.nullable === 'boolean', `${column.name}.nullable debe ser boolean.`);}
    if (column.foreignKey !== undefined) {
      assert(column.foreignKey && typeof column.foreignKey === 'object', `${column.name}.foreignKey debe ser objeto.`);
      assert(typeof column.foreignKey.schema === 'string' && column.foreignKey.schema, `${column.name}.foreignKey.schema es obligatorio.`);
      assert(typeof column.foreignKey.table === 'string' && column.foreignKey.table, `${column.name}.foreignKey.table es obligatorio.`);
      assert(typeof column.foreignKey.column === 'string' && column.foreignKey.column, `${column.name}.foreignKey.column es obligatorio.`);
    }
  }
  assert(definition.columns.some(c => c.primaryKey), 'se requiere al menos una llave primaria.');
  return true;
}
module.exports = { validateDefinition, VALID_TYPES };
