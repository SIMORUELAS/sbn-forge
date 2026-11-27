'use strict';
const { validateMultiDefinition } = require('./multi-definition-store');

async function verifyMultiReferentialEvidence(input, reader) {
  const definition = validateMultiDefinition(input);
  if (!reader || typeof reader.readForeignKeys !== 'function') {
    throw new TypeError('Se requiere lector PostgreSQL');
  }
  const results = [];
  const cache = new Map();
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
    results.push({ name: group.name, fromTable: group.fromTable, toTable: group.toTable,
      status: !exact ? 'catalog-mismatch' : immediate ? 'catalog-match' : 'catalog-policy-denied',
      certified: false });
  }
  return { kind: 'studio.multitable.referential-verification', version: 1,
    results, generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false };
}
module.exports = { verifyMultiReferentialEvidence };
