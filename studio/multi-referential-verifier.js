'use strict';
const { validateMultiDefinition } = require('./multi-definition-store');

async function verifyMultiReferentialEvidence(input, reader) {
  const definition = validateMultiDefinition(input);
  if (!reader || typeof reader.readForeignKeys !== 'function') {
    throw new TypeError('Se requiere lector PostgreSQL');
  }
  const results = [];
  const columns = new Map();
  async function readColumns(table) {
    if (!columns.has(table)) {
      columns.set(table, typeof reader.readColumns === 'function' ?
        await reader.readColumns(definition.source.schema, table) : []);
    }
    return columns.get(table);
  }
  const cache = new Map();
  const keys = new Map();
  async function readKeys(table) {
    if (!keys.has(table)) {
      const primary = typeof reader.readPrimaryKey === 'function' ?
        await reader.readPrimaryKey(definition.source.schema, table) : [];
      const unique = typeof reader.readUniqueConstraints === 'function' ?
        await reader.readUniqueConstraints(definition.source.schema, table) : [];
      keys.set(table, { primary: primary.map(row => row.column_name), unique });
    }
    return keys.get(table);
  }
  for (const group of definition.foreignKeyGroups) {
    if (!cache.has(group.fromTable)) {
      cache.set(group.fromTable, await reader.readForeignKeys(definition.source.schema, group.fromTable));
    }
    const rows = cache.get(group.fromTable).filter(row => row.constraint_name === group.name);
    const exact = rows.length === group.columns.length && rows.every((row, index) =>
      row.referenced_schema === definition.source.schema &&
      row.referenced_table === group.toTable &&
      row.column_name === group.columns[index].fromColumn &&
      row.referenced_column === group.columns[index].toColumn);
    const immediate = exact && rows.every(row => row.validated === true &&
      row.deferrable === false && row.initially_deferred === false &&
      ['s', 'f'].includes(row.match_type));
    const sourceColumns = await readColumns(group.fromTable);
    const targetColumns = await readColumns(group.toTable);
    const sourceTenant = sourceColumns.find(column => column.column_name === 'organization_id');
    const targetTenant = targetColumns.find(column => column.column_name === 'organization_id');
    const paired = group.columns.some(pair => pair.fromColumn === 'organization_id' &&
      pair.toColumn === 'organization_id');
    const tenantStatus = !sourceTenant || !targetTenant ? 'scope-unverified' :
      !paired ? 'tenant-key-missing' :
        sourceTenant.is_nullable !== 'NO' || targetTenant.is_nullable !== 'NO' ? 'tenant-nullability-unverified' :
          'tenant-pair-present';
    const typesMatch = group.columns.every(pair => {
      const from = sourceColumns.find(column => column.column_name === pair.fromColumn);
      const to = targetColumns.find(column => column.column_name === pair.toColumn);
      return Boolean(from && to && typeof from.data_type === 'string' &&
        from.data_type === to.data_type && typeof from.udt_name === 'string' && from.udt_name === to.udt_name);
    });
    const targetKeys = await readKeys(group.toTable);
    const matches = names => Array.isArray(names) && names.length === group.columns.length &&
      new Set(names).size === names.length && group.columns.every(pair => names.includes(pair.toColumn));
    const targetKey = matches(targetKeys.primary) ? 'primary-key' :
      targetKeys.unique.some(key => matches(key.columns)) ? 'unique-constraint' : 'unverified';
    const mandatoryPairs = group.columns.every(pair =>
      sourceColumns.find(column => column.column_name === pair.fromColumn)?.is_nullable === 'NO' &&
      targetColumns.find(column => column.column_name === pair.toColumn)?.is_nullable === 'NO');
    const safeActions = exact && rows.every(row =>
      ['NO ACTION', 'RESTRICT'].includes(row.update_rule) &&
      ['NO ACTION', 'RESTRICT'].includes(row.delete_rule));
    const policyCompatible = immediate && tenantStatus === 'tenant-pair-present' &&
      typesMatch && targetKey !== 'unverified' && mandatoryPairs && safeActions;
    results.push({ name: group.name, fromTable: group.fromTable, toTable: group.toTable,
      status: !exact ? 'catalog-mismatch' : policyCompatible ? 'catalog-match' : 'catalog-policy-denied',
      tenantStatus, typesMatch, targetKey, mandatoryPairs, safeActions, certified: false });
  }
  return { kind: 'studio.multitable.referential-verification', version: 1,
    results, generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false };
}
module.exports = { verifyMultiReferentialEvidence };
