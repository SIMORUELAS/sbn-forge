'use strict';
const { validateMultiDefinition } = require('./multi-definition-store');
const { assessMultiCompatibility } = require('./multi-compatibility-assessment');
const { validateDefinition: validateForge, VALID_TYPES } = require('../src/core/definition-validator');

const AUDIT = /^(created_at|created_by|updated_at|updated_by|deleted_at|deleted_by)$/;
const NORMALIZE_TYPES = new Map([
  ['int2', 'smallint'], ['int4', 'integer'], ['int8', 'bigint'],
  ['bool', 'boolean'], ['character varying', 'character varying'],
  ['timestamptz', 'timestamp with time zone'], ['timestamp without time zone', 'timestamp without time zone'],
  ['timestamp with time zone', 'timestamp with time zone']
]);
function normalizeType(value) {
  const raw = value.trim().toLowerCase();
  const base = raw.replace(/\s*\(\s*\d+(?:\s*,\s*\d+)?\s*\)$/, '');
  return NORMALIZE_TYPES.get(base) || base;
}
function createMultiForgeAdapter(input) {
  const definition = validateMultiDefinition(input);
  const assessment = assessMultiCompatibility(definition);
  const blockers = [...assessment.blockers];
  const resources = [];
  for (const table of definition.tables) {
    const columns = table.columns.map(column => {
      const type = normalizeType(column.type);
      const primaryKey = table.primaryKey.includes(column.name);
      const field = { name: column.name, type, nullable: column.nullable, primaryKey,
        generated: column.identity === true,
        writable: !primaryKey && !AUDIT.test(column.name) &&
          table.fieldSettings[column.name]?.editable !== false };
      if (column.defaultValue !== undefined && column.defaultValue !== null) {
        field.hasDefault = true;
        field.default = column.defaultValue;
      }
      if (Number.isInteger(column.maxLength)) { field.length = column.maxLength; }
      if (Number.isInteger(column.precision)) { field.precision = column.precision; }
      if (Number.isInteger(column.scale)) { field.scale = column.scale; }
      return field;
    });
    const definitionPreview = { schema: definition.source.schema, table: table.name, columns };
    const issues = [];
    if (!table.primaryKey.length) { issues.push('Clave primaria ausente'); }
    if (columns.some(column => !VALID_TYPES.has(column.type))) {
      issues.push('Tipos no compatibles con el validador Forge');
    }
    if (table.primaryKey.length > 1) {
      issues.push('Clave primaria compuesta: contrato de rutas pendiente');
    }
    const outgoing = definition.foreignKeyGroups.filter(group => group.fromTable === table.name);
    const compositeRelations = outgoing.filter(group => group.columns.length > 1).map(group => ({
      name: group.name, targetSchema: definition.source.schema, targetTable: group.toTable,
      columns: group.columns.map(pair => ({ ...pair })),
      evidence: assessment.referentialEvidence.find(item => item.fromTable === table.name && item.name === group.name),
      executable: false
    }));
    if (outgoing.some(group => group.columns.length > 1)) {
      issues.push('Clave foránea compuesta: adaptador de operaciones pendiente');
    }
    try { validateForge(definitionPreview); }
    catch (error) { issues.push(error.message); }
    if (table.settings.resourceEnabled && issues.length) {
      blockers.push(...issues.map(issue => table.name + ': ' + issue));
    }
    resources.push({ table: table.name, enabled: table.settings.resourceEnabled,
      definition: definitionPreview, foreignKeyGroups: outgoing, compositeRelations,
      compatible: issues.length === 0, blockers: issues, executable: false });
  }
  return { kind: 'studio.multitable.forge-adapter-preview', version: 1,
    mode: 'plan-only', resources, blockers: [...new Set(blockers)],
    warnings: assessment.warnings, compatible: blockers.length === 0 &&
      resources.filter(resource => resource.enabled).every(resource => resource.compatible),
    readyForGeneration: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    notice: 'Adaptación estructural exclusivamente; no genera archivos, no ejecuta SQL ni instala módulos.' };
}
module.exports = { createMultiForgeAdapter, normalizeType };
