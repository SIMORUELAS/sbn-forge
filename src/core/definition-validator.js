'use strict';
const VALID_TYPES = new Set(['bigint','integer','smallint','uuid','boolean','varchar','character varying','text','json','jsonb','timestamp','timestamp without time zone','timestamp with time zone','date','numeric','decimal']);
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
    if (column.minimum !== undefined || column.maximum !== undefined) {
      assert(['smallint', 'integer', 'bigint', 'numeric', 'decimal'].includes(column.type.toLowerCase()), `${column.name}: minimum/maximum requiere tipo numérico.`);
      for (const key of ['minimum', 'maximum']) {
        if (column[key] !== undefined) {
          assert(typeof column[key] === 'number' && Number.isFinite(column[key]), `${column.name}.${key} debe ser numérico finito.`);
        }
      }
      assert(column.minimum === undefined || column.maximum === undefined || column.minimum <= column.maximum, `${column.name}: minimum supera maximum.`);
      if (column.type.toLowerCase() === 'smallint') {
        assert(column.minimum === undefined || column.minimum >= -32768, `${column.name}: minimum fuera de SMALLINT.`);
        assert(column.maximum === undefined || column.maximum <= 32767, `${column.name}: maximum fuera de SMALLINT.`);
      }
    }
    if (column.enum !== undefined) {
      assert(Array.isArray(column.enum) && column.enum.length > 0, `${column.name}.enum debe ser arreglo no vacío.`);
      assert(['varchar', 'character varying', 'text'].includes(column.type.toLowerCase()), `${column.name}.enum solo admite tipos de texto.`);
      assert(column.enum.every(value => typeof value === 'string' && value.length > 0), `${column.name}.enum requiere cadenas no vacías.`);
      assert(new Set(column.enum).size === column.enum.length, `${column.name}.enum contiene duplicados.`);
    }
    if (column.foreignKey !== undefined) {
      assert(column.foreignKey && typeof column.foreignKey === 'object', `${column.name}.foreignKey debe ser objeto.`);
      assert(typeof column.foreignKey.schema === 'string' && column.foreignKey.schema, `${column.name}.foreignKey.schema es obligatorio.`);
      assert(typeof column.foreignKey.table === 'string' && column.foreignKey.table, `${column.name}.foreignKey.table es obligatorio.`);
      assert(typeof column.foreignKey.column === 'string' && column.foreignKey.column, `${column.name}.foreignKey.column es obligatorio.`);
    }
  }
  if (definition.compositeRelations !== undefined) {
    assert(Array.isArray(definition.compositeRelations), 'compositeRelations debe ser arreglo.');
    const identifiers = /^[a-z][a-z0-9_]*$/;
    const groups = new Set();
    for (const group of definition.compositeRelations) {
      assert(group && ['name', 'targetSchema', 'targetTable'].every(key =>
        typeof group[key] === 'string' && identifiers.test(group[key])), 'identificador de relación compuesta inválido.');
      assert(!groups.has(group.name), 'relación compuesta duplicada.');
      groups.add(group.name);
      assert(Array.isArray(group.columns) && group.columns.length >= 2 && group.columns.length <= 32,
        'relación compuesta requiere entre 2 y 32 columnas.');
      assert(group.columns.every(pair => pair && names.has(pair.fromColumn) &&
        typeof pair.toColumn === 'string' && identifiers.test(pair.toColumn)), 'columnas de relación compuesta inválidas.');
      assert(new Set(group.columns.map(pair => pair.fromColumn)).size === group.columns.length &&
        new Set(group.columns.map(pair => pair.toColumn)).size === group.columns.length,
      'columnas de relación compuesta duplicadas.');
    }
    assert(definition.compositeRelations.length === 0, 'relaciones compuestas aún no admitidas para generación ejecutable.');
  }
  assert(definition.columns.some(c => c.primaryKey), 'se requiere al menos una llave primaria.');
  return true;
}
module.exports = { validateDefinition, VALID_TYPES };
