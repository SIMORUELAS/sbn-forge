'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_$]*$/;
const NAME = /^[a-zA-Z_][a-zA-Z0-9_-]{0,79}$/;
const MAX_BYTES = 256 * 1024;
const AUDIT = /^(created_at|created_by|updated_at|updated_by|deleted_at|deleted_by)$/;
function validateMultiDefinition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      value.kind !== 'studio.multitable.preview' || value.version !== 1 ||
      typeof value.name !== 'string' || !NAME.test(value.name) ||
      value.mode !== 'READ_ONLY_PREVIEW' || !value.source ||
      typeof value.source.profile !== 'string' || !NAME.test(value.source.profile) ||
      !IDENT.test(value.source.schema || '') ||
      !Array.isArray(value.tables) || value.tables.length < 1 || value.tables.length > 200 ||
      !Array.isArray(value.relations) || value.relations.length > 2000) {
    throw new Error('Definición multitabla inválida');
  }
  const seen = new Set();
  const tables = value.tables.map(table => {
    if (!table || !IDENT.test(table.name || '') || seen.has(table.name) ||
        !Array.isArray(table.columns) || !table.columns.length || table.columns.length > 500 ||
        !Array.isArray(table.primaryKey)) { throw new Error('Tabla inválida o duplicada'); }
    seen.add(table.name);
    const columns = new Set();
    const cleanedColumns = table.columns.map(column => {
      if (!column || !IDENT.test(column.name || '') || columns.has(column.name) ||
          typeof column.type !== 'string' || !column.type.trim() || column.type.length > 120 ||
          typeof column.nullable !== 'boolean') { throw new Error('Columna inválida o duplicada'); }
      columns.add(column.name);
      const optional = {};
      if (Object.prototype.hasOwnProperty.call(column, 'defaultValue')) {
        if (column.defaultValue !== null && (typeof column.defaultValue !== 'string' || column.defaultValue.length > 4096)) {
          throw new Error('Valor predeterminado inválido');
        }
        optional.defaultValue = column.defaultValue;
      }
      for (const key of ['maxLength', 'precision', 'scale']) {
        if (Object.prototype.hasOwnProperty.call(column, key)) {
          if (column[key] !== null && (!Number.isSafeInteger(column[key]) || column[key] < 0)) {
            throw new Error('Metadatos numéricos inválidos');
          }
          optional[key] = column[key];
        }
      }
      if (Object.prototype.hasOwnProperty.call(column, 'identity')) {
        if (typeof column.identity !== 'boolean') { throw new Error('Identidad inválida'); }
        optional.identity = column.identity;
      }
      if (Object.prototype.hasOwnProperty.call(column, 'identityGeneration')) {
        if (column.identityGeneration !== null && !['ALWAYS', 'BY DEFAULT'].includes(column.identityGeneration)) {
          throw new Error('Generación de identidad inválida');
        }
        optional.identityGeneration = column.identityGeneration;
      }
      return { name: column.name, type: column.type, nullable: column.nullable, ...optional };
    });
    if (!table.primaryKey.every(key => IDENT.test(key) && columns.has(key))) {
      throw new Error('Clave primaria inválida');
    }
    const settings = table.settings || {};
    if (typeof settings !== 'object' || Array.isArray(settings) ||
        (settings.label !== undefined && (typeof settings.label !== 'string' || settings.label.length > 120)) ||
        (settings.resourceEnabled !== undefined && typeof settings.resourceEnabled !== 'boolean') ||
        (settings.formEnabled !== undefined && typeof settings.formEnabled !== 'boolean') ||
        (settings.permissions !== undefined && (!Array.isArray(settings.permissions) ||
          settings.permissions.some(permission => !['read', 'create', 'update', 'delete'].includes(permission)) ||
          new Set(settings.permissions).size !== settings.permissions.length))) {
      throw new Error('Configuración de recurso inválida');
    }
    const fieldSettings = table.fieldSettings || {};
    if (!fieldSettings || typeof fieldSettings !== 'object' || Array.isArray(fieldSettings) ||
        Object.keys(fieldSettings).some(key => !columns.has(key))) { throw new Error('Configuración de campos inválida'); }
    const cleanedFieldSettings = {};
    for (const [field, config] of Object.entries(fieldSettings)) {
      if (!config || typeof config !== 'object' || Array.isArray(config) ||
          ['visible', 'editable', 'required'].some(key => typeof config[key] !== 'boolean') ||
          (config.required && (!config.visible || !config.editable)) ||
          ((table.primaryKey.includes(field) || AUDIT.test(field)) && (config.editable || config.required))) {
        throw new Error('Configuración de campo inválida o protegida');
      }
      cleanedFieldSettings[field] = { visible: config.visible, editable: config.editable, required: config.required };
    }
    const uniqueConstraints = table.uniqueConstraints;
    if (uniqueConstraints !== undefined && (!Array.isArray(uniqueConstraints) ||
        uniqueConstraints.length > 500 || uniqueConstraints.some(item =>
          !item || !IDENT.test(item.name || '') || !Array.isArray(item.columns) ||
          !item.columns.length || item.columns.length > 32 ||
          new Set(item.columns).size !== item.columns.length ||
          !item.columns.every(key => columns.has(key))) ||
        new Set(uniqueConstraints.map(item => item.name)).size !== uniqueConstraints.length)) {
      throw new Error('Restricciones UNIQUE inválidas');
    }
    return { name: table.name, columns: cleanedColumns, primaryKey: [...table.primaryKey],
      ...(uniqueConstraints === undefined ? {} : { uniqueConstraints: uniqueConstraints.map(item =>
        ({ name: item.name, columns: [...item.columns] })) }),
      settings: { label: settings.label || table.name, resourceEnabled: settings.resourceEnabled !== false,
        formEnabled: settings.formEnabled !== false, permissions: settings.permissions || ['read'] },
      fieldSettings: cleanedFieldSettings };
  });
  if (value.primaryTable !== null && value.primaryTable !== undefined &&
      !seen.has(value.primaryTable)) { throw new Error('Tabla principal inválida'); }
  const byName = new Map(tables.map(table => [table.name, new Set(table.columns.map(column => column.name))]));
  const relations = value.relations.map(relation => {
    if (!relation || !byName.get(relation.fromTable)?.has(relation.fromColumn) ||
        !byName.get(relation.toTable)?.has(relation.toColumn)) { throw new Error('Relación inválida'); }
    return { fromTable: relation.fromTable, fromColumn: relation.fromColumn,
      toTable: relation.toTable, toColumn: relation.toColumn };
  });
  if (value.foreignKeyGroups !== undefined && !Array.isArray(value.foreignKeyGroups)) {
    throw new Error('Restricciones de claves foráneas inválidas');
  }
  const foreignKeyGroups = (value.foreignKeyGroups || []).map(group => {
    if (!group || !IDENT.test(group.name || '') ||
        !seen.has(group.fromTable) || !seen.has(group.toTable) ||
        !Array.isArray(group.columns) || !group.columns.length || group.columns.length > 32 ||
        group.columns.some(pair => !pair ||
          !byName.get(group.fromTable).has(pair.fromColumn) ||
          !byName.get(group.toTable).has(pair.toColumn) ||
          !relations.some(rel => rel.fromTable === group.fromTable &&
            rel.toTable === group.toTable && rel.fromColumn === pair.fromColumn &&
            rel.toColumn === pair.toColumn))) {
      throw new Error('Restricción de clave foránea inválida');
    }
    if (new Set(group.columns.map(pair => pair.fromColumn)).size !== group.columns.length ||
        new Set(group.columns.map(pair => pair.toColumn)).size !== group.columns.length) {
      throw new Error('Columnas de restricción duplicadas');
    }
    const evidence = group.evidence;
    if (evidence !== undefined && (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) ||
        ['validated', 'deferrable', 'initiallyDeferred'].some(key =>
          evidence[key] !== undefined && typeof evidence[key] !== 'boolean') ||
        (evidence.matchType !== undefined && !['s', 'f', 'p'].includes(evidence.matchType)))) {
      throw new Error('Evidencia referencial inválida');
    }
    const cleanedEvidence = {};
    for (const key of ['validated', 'deferrable', 'initiallyDeferred', 'matchType']) {
      if (evidence?.[key] !== undefined) { cleanedEvidence[key] = evidence[key]; }
    }
    return { name: group.name, fromTable: group.fromTable, toTable: group.toTable,
      ...(evidence === undefined ? {} : { evidence: { ...cleanedEvidence, certified: false } }),
      columns: group.columns.map(pair => ({ fromColumn: pair.fromColumn, toColumn: pair.toColumn })) };
  });
  if (!Array.isArray(value.foreignKeyGroups || []) ||
      foreignKeyGroups.length > 2000 ||
      new Set(foreignKeyGroups.map(group => group.fromTable + ':' + group.name)).size !== foreignKeyGroups.length) {
    throw new Error('Restricciones duplicadas o inválidas');
  }
  const result = { kind: 'studio.multitable.preview', version: 1, name: value.name,
    mode: 'READ_ONLY_PREVIEW', source: { profile: value.source.profile, schema: value.source.schema },
    primaryTable: value.primaryTable || null, tables, relations, foreignKeyGroups,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false };
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_BYTES) { throw new Error('Definición demasiado grande'); }
  return result;
}
function createMultiDefinitionStore(directory = path.join(os.homedir(), '.sbn-forge-studio', 'multi-definitions')) {
  const filename = name => {
    if (!NAME.test(name || '')) { throw new Error('Nombre inválido'); }
    return path.join(directory, name + '.json');
  };
  const ensure = () => fs.mkdir(directory, { recursive: true, mode: 0o700 });
  return {
    async list() {
      await ensure();
      return (await fs.readdir(directory)).filter(file => file.endsWith('.json') &&
        NAME.test(file.slice(0, -5))).map(file => file.slice(0, -5)).sort();
    },
    async get(name) { return validateMultiDefinition(JSON.parse(await fs.readFile(filename(name), 'utf8'))); },
    async save(value) {
      const cleaned = validateMultiDefinition(value);
      await ensure();
      const temp = path.join(directory, '.' + cleaned.name + '-' + crypto.randomUUID() + '.tmp');
      try {
        await fs.writeFile(temp, JSON.stringify(cleaned, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await fs.rename(temp, filename(cleaned.name));
      } finally { await fs.rm(temp, { force: true }); }
      return cleaned;
    }
  };
}
module.exports = { createMultiDefinitionStore, validateMultiDefinition };
