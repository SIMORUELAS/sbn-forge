'use strict';
const { createMultiResourceContracts } = require('./multi-resource-contracts');
const { validateMultiDefinition } = require('./multi-definition-store');
const { validateDefinition: validateForge } = require('../src/core/definition-validator');
function assessMultiCompatibility(input) {
  const definition = validateMultiDefinition(input);
  const preview = createMultiResourceContracts(definition);
  const blockers = [...preview.blockers.filter(message => !message.startsWith('Faltan restricciones completas'))];
  const warnings = [...preview.warnings];
  const resources = [];
  const grouped = new Set();
  const tenantRelations = [];
  const referentialEvidence = [];
  for (const group of definition.foreignKeyGroups) {
    for (const pair of group.columns) {
      const key = [group.fromTable, pair.fromColumn, group.toTable, pair.toColumn].join(':');
      if (grouped.has(key)) { blockers.push('Relación repetida en restricciones: ' + key); }
      grouped.add(key);
    }
    const source = definition.tables.find(table => table.name === group.fromTable);
    const target = definition.tables.find(table => table.name === group.toTable);
    const sourceTenant = source.columns.find(column => column.name === 'organization_id');
    const targetTenant = target.columns.find(column => column.name === 'organization_id');
    if (sourceTenant || targetTenant) {
      const paired = group.columns.some(pair =>
        pair.fromColumn === 'organization_id' && pair.toColumn === 'organization_id');
      const status = !sourceTenant || !targetTenant ? 'scope-unverified' :
        !paired ? 'tenant-key-missing' :
          sourceTenant.nullable || targetTenant.nullable ? 'nullable-tenant-key' :
            'tenant-pair-present';
      tenantRelations.push({ name: group.name, fromTable: group.fromTable,
        toTable: group.toTable, status, certified: false });
      if (status !== 'tenant-pair-present') {
        warnings.push(group.name + ': integridad multiempresa no certificada (' + status + ').');
      }
    }
    const targetKeys = target.primaryKey;
    const matches = keys => keys.length === group.columns.length &&
      new Set(keys).size === keys.length &&
      group.columns.every(pair => keys.includes(pair.toColumn));
    const unique = (target.uniqueConstraints || []).find(item => matches(item.columns));
    const targetKey = matches(targetKeys) ? 'primary-key' : unique ? 'declared-unique' : 'unverified';
    const typesMatch = group.columns.every(pair =>
      source.columns.find(column => column.name === pair.fromColumn).type.trim().toLowerCase() ===
      target.columns.find(column => column.name === pair.toColumn).type.trim().toLowerCase());
    const evidence = group.evidence;
    const constraintStatus = !evidence ? 'unknown' :
      evidence.validated === false ? 'not-validated' :
        evidence.deferrable === true || evidence.initiallyDeferred === true ? 'deferred' :
          evidence.matchType !== undefined && !['s', 'f'].includes(evidence.matchType) ? 'unsupported-match' :
            evidence.validated === true && evidence.deferrable === false &&
            evidence.initiallyDeferred === false && ['s', 'f'].includes(evidence.matchType) ?
              'declared-compatible' : 'unknown';
    if (constraintStatus !== 'declared-compatible') {
      warnings.push(group.name + ': evidencia de restricción (' + constraintStatus + ').');
    }
    referentialEvidence.push({ name: group.name, fromTable: group.fromTable,
      toTable: group.toTable, targetKey, uniqueConstraint: unique?.name || null,
      typesMatch, constraintStatus, certified: false });
    if (!typesMatch) {
      warnings.push(group.name + ': tipos de relación distintos; requiere revisión.');
    }
    if (targetKey === 'unverified') {
      warnings.push(group.name + ': destino no coincide con la clave primaria; requiere evidencia UNIQUE.');
    }
    if (!source.settings.resourceEnabled || !target.settings.resourceEnabled) {
      warnings.push(group.name + ': recurso relacionado deshabilitado.');
    }
  }
  for (const relation of definition.relations) {
    const key = [relation.fromTable, relation.fromColumn, relation.toTable, relation.toColumn].join(':');
    if (!grouped.has(key)) { blockers.push('Relación sin restricción identificada: ' + key); }
  }
  for (const contract of preview.contracts) {
    const table = definition.tables.find(item => item.name === contract.name);
    const columns = contract.fields.map(field => ({
      name: field.name, type: field.sourceType.toLowerCase().trim(), nullable: field.nullable,
      primaryKey: table.primaryKey.includes(field.name), generated: field.identity,
      writable: field.editable && !field.protected
    }));
    let forgeValidatorCompatible = false;
    try {
      validateForge({ schema: definition.source.schema, table: table.name, columns });
      forgeValidatorCompatible = true;
    } catch (error) { warnings.push(table.name + ': validador Forge: ' + error.message); }
    if (contract.enabled) {
      for (const field of contract.fields) {
        if (!field.nullable && !field.protected && field.editable &&
            !field.required && field.defaultValue === null && !field.identity) {
          blockers.push(table.name + '.' + field.name + ': campo obligatorio sin regla de creación.');
        }
      }
    }
    resources.push({ table: table.name, enabled: contract.enabled,
      forgeValidatorCompatible, keyStrategy: contract.keyStrategy,
      metadataComplete: contract.fields.every(field => field.metadataComplete),
      executable: false });
  }
  return { kind: 'studio.multitable.compatibility-assessment', version: 1,
    mode: 'read-only', resources, tenantRelations, referentialEvidence, tenantIntegrityCertified: false, blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)], compatible: blockers.length === 0 &&
      resources.filter(item => item.enabled).every(item => item.forgeValidatorCompatible),
    readyForGeneration: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    notice: 'Evaluación estructural exclusivamente; no ejecuta generadores, SQL ni instalaciones.' };
}
module.exports = { assessMultiCompatibility };
