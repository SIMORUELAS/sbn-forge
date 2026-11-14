'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_$]*$/;
const NAME = /^[a-zA-Z_][a-zA-Z0-9_-]{0,79}$/;
const MAX_BYTES = 256 * 1024;
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
      return { name: column.name, type: column.type, nullable: column.nullable };
    });
    if (!table.primaryKey.every(key => IDENT.test(key) && columns.has(key))) {
      throw new Error('Clave primaria inválida');
    }
    return { name: table.name, columns: cleanedColumns, primaryKey: [...table.primaryKey] };
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
  const result = { kind: 'studio.multitable.preview', version: 1, name: value.name,
    mode: 'READ_ONLY_PREVIEW', source: { profile: value.source.profile, schema: value.source.schema },
    primaryTable: value.primaryTable || null, tables, relations,
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
