'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const NAME = /^[a-zA-Z_][a-zA-Z0-9_-]{0,79}$/;
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_$]*$/;
const MAX_BYTES = 256 * 1024;
const AUDIT = /^(created_at|created_by|updated_at|updated_by|deleted_at|deleted_by)$/;
const defaultDirectory = path.join(os.homedir(), '.sbn-forge-studio', 'definitions');

function validateDefinition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) { throw new Error('Definición inválida'); }
  const { version, name, source, primaryKey, foreignKeys, fields } = value;
  if (version !== 1 || typeof name !== 'string' || !NAME.test(name)) { throw new Error('Versión o nombre de módulo inválido'); }
  if (!source || source.type !== 'postgresql' || !IDENT.test(source.schema || '') || !IDENT.test(source.table || '')) { throw new Error('Origen PostgreSQL inválido'); }
  if (!Array.isArray(fields) || fields.length < 1 || fields.length > 500) { throw new Error('Lista de campos inválida'); }
  const keys = primaryKey?.columns;
  if (!Array.isArray(keys) || !keys.length || !keys.every(key => typeof key === 'string' && IDENT.test(key))) { throw new Error('Clave primaria inválida'); }
  if (foreignKeys !== undefined && !Array.isArray(foreignKeys)) { throw new Error('Claves foráneas inválidas'); }
  const seen = new Set();
  const cleanedFields = fields.map(field => {
    if (!field || !IDENT.test(field.name || '') || seen.has(field.name) || typeof field.dataType !== 'string' || field.dataType.length > 120 ||
        typeof field.nullable !== 'boolean' || ['visible', 'editable', 'required'].some(prop => typeof field[prop] !== 'boolean')) {
      throw new Error('Campo duplicado o inválido');
    }
    seen.add(field.name);
    if (field.required && (!field.editable || !field.visible)) { throw new Error('Un campo obligatorio debe ser visible y editable: ' + field.name); }
    if ((keys.includes(field.name) || AUDIT.test(field.name)) && (field.editable || field.required)) { throw new Error('Campo del sistema protegido: ' + field.name); }
    return { name: field.name, dataType: field.dataType, nullable: field.nullable, visible: field.visible, editable: field.editable, required: field.required };
  });
  if (!keys.every(key => seen.has(key))) { throw new Error('Clave primaria ausente en los campos'); }
  const cleaned = { version: 1, name, source: { type: 'postgresql', schema: source.schema, table: source.table },
    primaryKey: { name: typeof primaryKey.name === 'string' ? primaryKey.name : null, columns: [...keys] },
    foreignKeys: foreignKeys || [], fields: cleanedFields };
  if (Buffer.byteLength(JSON.stringify(cleaned)) > MAX_BYTES) { throw new Error('Definición demasiado grande'); }
  return cleaned;
}

function createDefinitionStore(directory = defaultDirectory) {
  async function ensure() { await fs.mkdir(directory, { recursive: true, mode: 0o700 }); }
  function filename(name) {
    if (typeof name !== 'string' || !NAME.test(name)) { throw new Error('Nombre de módulo inválido'); }
    return path.join(directory, name + '.json');
  }
  return {
    async list() {
      await ensure();
      const names = await fs.readdir(directory);
      return names.filter(name => name.endsWith('.json') && NAME.test(name.slice(0, -5))).map(name => name.slice(0, -5)).sort();
    },
    async get(name) {
      const content = await fs.readFile(filename(name), 'utf8');
      return validateDefinition(JSON.parse(content));
    },
    async save(definition) {
      const cleaned = validateDefinition(definition);
      await ensure();
      const destination = filename(cleaned.name);
      const temporary = path.join(directory, '.' + cleaned.name + '-' + require('node:crypto').randomUUID() + '.tmp');
      try {
        await fs.writeFile(temporary, JSON.stringify(cleaned, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await fs.rename(temporary, destination);
      } finally {
        await fs.rm(temporary, { force: true });
      }
      return cleaned;
    }
  };
}
module.exports = { createDefinitionStore, validateDefinition, MAX_BYTES };
