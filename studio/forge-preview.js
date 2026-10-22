'use strict';
const { validateDefinition: validateStudio } = require('./definition-store');
const { validateDefinition: validateForge } = require('../src/core/definition-validator');

const AUDIT = /^(created_at|created_by|updated_at|updated_by|deleted_at|deleted_by)$/;
const SUPPORTED = new Set(['bigint','integer','smallint','uuid','boolean','varchar','character varying','text','json','jsonb','timestamp','timestamp without time zone','timestamp with time zone','date','numeric','decimal']);

function toForgePreview(input) {
  const definition = validateStudio(input);
  const primaryKeys = new Set(definition.primaryKey.columns);
  const relations = new Map();
  const warnings = [];
  const blockers = [];
  for (const fk of definition.foreignKeys) {
    if (!fk || typeof fk !== 'object') { blockers.push('Relación foránea inválida; revisar metadatos originales.'); continue; }
    const columns = Array.isArray(fk.columns) ? fk.columns : [fk.column];
    const referencedColumns = Array.isArray(fk.referencedColumns) ? fk.referencedColumns : [fk.referencedColumn];
    if (columns.length !== 1 || referencedColumns.length !== 1) {
      blockers.push('Relación compuesta ' + String(fk.name || '') + ' requiere tratamiento especializado.');
      continue;
    }
    if (columns[0] && fk.referencedSchema && fk.referencedTable && referencedColumns[0]) {
      relations.set(columns[0], { schema: fk.referencedSchema, table: fk.referencedTable, column: referencedColumns[0] });
    } else { blockers.push('Relación foránea incompleta: ' + String(fk.name || 'sin nombre')); }
  }
  const columns = definition.fields.map(field => {
    const type = field.dataType.toLowerCase().trim();
    const column = {
      name: field.name,
      type,
      nullable: field.nullable,
      primaryKey: primaryKeys.has(field.name),
      generated: field.identity === true,
      writable: field.editable && !primaryKeys.has(field.name) && !AUDIT.test(field.name)
    };
    const metadataKeys = ['defaultValue', 'identity', 'maxLength', 'precision', 'scale'];
    const missing = metadataKeys.filter(key => !Object.prototype.hasOwnProperty.call(field, key));
    if (missing.length) { blockers.push('Metadatos originales incompletos para ' + field.name + ': ' + missing.join(', ')); }
    if (Object.prototype.hasOwnProperty.call(field, 'defaultValue') && field.defaultValue !== null) {
      column.hasDefault = true;
      column.default = field.defaultValue;
    }
    if (Number.isInteger(field.maxLength)) { column.length = field.maxLength; }
    if (Number.isInteger(field.precision)) { column.precision = field.precision; }
    if (Number.isInteger(field.scale)) { column.scale = field.scale; }
    if (relations.has(field.name)) { column.foreignKey = relations.get(field.name); }
    if (!SUPPORTED.has(type)) { warnings.push('Tipo no soportado por validador Forge: ' + field.name + ' (' + type + ')'); }
    if (!field.nullable && !field.required && field.editable && (field.defaultValue === null || field.defaultValue === undefined) && field.identity !== true) {
      blockers.push('Comprobar valor predeterminado o regla de creación para: ' + field.name);
    }
    return column;
  });
  const preview = { schema: definition.source.schema, table: definition.source.table, columns };
  let compatible = false;
  try { validateForge(preview); compatible = true; }
  catch (error) { warnings.push(error.message); }
  warnings.push('Vista preliminar de contrato; no genera ni publica migraciones.');
  return { name: definition.name, compatible, readyForGeneration: compatible && blockers.length === 0, preview, warnings: [...blockers, ...warnings], blockers };
}
module.exports = { toForgePreview };
