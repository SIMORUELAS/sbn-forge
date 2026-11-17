'use strict';
const { validateMultiDefinition } = require('./multi-definition-store');
const AUDIT = /^(created_at|created_by|updated_at|updated_by|deleted_at|deleted_by)$/;
const TYPE_MAP = [
  [/^(uuid)$/i, 'uuid'], [/^(smallint|integer|int|bigint|int2|int4|int8)$/i, 'integer'],
  [/^(numeric|decimal|real|double precision|float4|float8)(\s*\(.*\))?$/i, 'number'],
  [/^(boolean|bool)$/i, 'boolean'], [/^(date|timestamp.*|time.*)$/i, 'datetime'],
  [/^(json|jsonb)$/i, 'json'], [/^(text|varchar.*|character varying.*|char.*|citext)$/i, 'string']
];
function mapType(type) {
  const match = TYPE_MAP.find(([pattern]) => pattern.test(type.trim()));
  return match ? match[1] : 'unsupported';
}
function createMultiResourceContracts(input) {
  const definition = validateMultiDefinition(input);
  const blockers = [];
  const warnings = [];
  const contracts = definition.tables.map(table => {
    const primary = new Set(table.primaryKey);
    const fields = table.columns.map(column => {
      const protectedField = primary.has(column.name) || AUDIT.test(column.name);
      const settings = table.fieldSettings[column.name] || {
        visible: true, editable: !protectedField, required: !protectedField && !column.nullable
      };
      const mappedType = mapType(column.type);
      if (mappedType === 'unsupported') {
        blockers.push(table.name + '.' + column.name + ': tipo PostgreSQL no soportado: ' + column.type);
      }
      return { name: column.name, sourceType: column.type, type: mappedType,
        defaultValue: Object.prototype.hasOwnProperty.call(column, 'defaultValue') ? column.defaultValue : null,
        maxLength: column.maxLength ?? null, precision: column.precision ?? null,
        scale: column.scale ?? null, identity: column.identity === true,
        identityGeneration: column.identityGeneration ?? null,
        metadataComplete: ['defaultValue', 'maxLength', 'precision', 'scale', 'identity', 'identityGeneration']
          .every(key => Object.prototype.hasOwnProperty.call(column, key)),
        nullable: column.nullable, visible: settings.visible, editable: settings.editable,
        required: settings.required, protected: protectedField };
    });
    if (!table.primaryKey.length) { blockers.push(table.name + ': falta clave primaria'); }
    const relations = definition.relations.filter(rel => rel.fromTable === table.name).map(rel => ({
      ...rel, targetKey: definition.tables.find(item => item.name === rel.toTable).primaryKey.includes(rel.toColumn)
    }));
    for (const relation of relations) {
      if (!relation.targetKey) {
        warnings.push(table.name + '.' + relation.fromColumn + ': relación hacia columna no primaria; requiere verificar UNIQUE.');
      }
    }
    return { kind: 'studio.multitable.resource-contract', version: 1,
      name: table.name, source: { profile: definition.source.profile,
        schema: definition.source.schema, table: table.name },
      label: table.settings.label, enabled: table.settings.resourceEnabled,
      form: { enabled: table.settings.formEnabled },
      permissions: [...table.settings.permissions], primaryKey: [...table.primaryKey],
      keyStrategy: table.primaryKey.length > 1 ? 'composite' : table.primaryKey.length === 1 ? 'single' : 'missing',
      fields, relations,
      foreignKeyGroups: definition.foreignKeyGroups.filter(group => group.fromTable === table.name),
      executable: false };
  });
  const enabled = contracts.filter(contract => contract.enabled);
  if (!enabled.length) { blockers.push('No hay recursos habilitados'); }
  if (contracts.some(contract => contract.fields.some(field => !field.metadataComplete))) {
    blockers.push('Metadatos incompletos para generar: faltan propiedades originales de columnas.');
  }
  if (definition.relations.length && !definition.foreignKeyGroups.length) {
    blockers.push('Metadatos incompletos para generar: faltan restricciones de claves foráneas agrupadas.');
  }
  blockers.push('Faltan restricciones completas, validación de compatibilidad y autorización explícita del motor multitabla.');
  return { kind: 'studio.multitable.resource-contracts', version: 1,
    name: definition.name, source: definition.source, mode: 'contract-preview',
    readyForGeneration: false, executable: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false,
    contracts, blockers, warnings, totals: { tables: contracts.length, enabled: enabled.length },
    notice: 'Contratos de diseño, no contratos ejecutables. No generan código ni modifican PostgreSQL.' };
}
module.exports = { createMultiResourceContracts, mapType };
