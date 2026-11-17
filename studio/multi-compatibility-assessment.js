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
  for (const group of definition.foreignKeyGroups) {
    for (const pair of group.columns) {
      const key = [group.fromTable, pair.fromColumn, group.toTable, pair.toColumn].join(':');
      if (grouped.has(key)) { blockers.push('Relación repetida en restricciones: ' + key); }
      grouped.add(key);
    }
    const source = definition.tables.find(table => table.name === group.fromTable);
    const target = definition.tables.find(table => table.name === group.toTable);
    const targetKeys = target.primaryKey;
    if (group.columns.length !== targetKeys.length ||
        !group.columns.every(pair => targetKeys.includes(pair.toColumn))) {
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
    mode: 'read-only', resources, blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)], compatible: blockers.length === 0 &&
      resources.filter(item => item.enabled).every(item => item.forgeValidatorCompatible),
    readyForGeneration: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    notice: 'Evaluación estructural exclusivamente; no ejecuta generadores, SQL ni instalaciones.' };
}
module.exports = { assessMultiCompatibility };
