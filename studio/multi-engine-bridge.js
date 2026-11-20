'use strict';
const { validateDefinition } = require('../src/core/definition-validator');
const { createGeneratorContext } = require('../src/core/generator-context');
const { createMultiForgeAdapter } = require('./multi-forge-adapter');
const { createMultiCompositionPlan } = require('./multi-composition-plan');

function createMultiEngineBridge(input) {
  const adapter = createMultiForgeAdapter(input);
  const composition = createMultiCompositionPlan(input);
  const byTable = new Map(adapter.resources.map(resource => [resource.table, resource]));
  const resources = composition.orderedTables.map(table => {
    const resource = byTable.get(table);
    const reasons = [...resource.blockers];
    const definition = { ...resource.definition,
      columns: resource.definition.columns.map(column => ({ ...column })) };
    if (resource.foreignKeyGroups.some(group => group.columns.length > 1)) {
      reasons.push('Clave foránea compuesta: requiere soporte explícito en el motor');
    }
    for (const group of resource.foreignKeyGroups) {
      if (group.columns.length !== 1) { continue; }
      const pair = group.columns[0];
      const column = definition.columns.find(item => item.name === pair.fromColumn);
      if (!column) { reasons.push('Columna de relación ausente: ' + pair.fromColumn); continue; }
      if (column.foreignKey) {
        reasons.push('Múltiples relaciones sobre la columna: ' + pair.fromColumn);
        continue;
      }
      column.foreignKey = { schema: definition.schema, table: group.toTable, column: pair.toColumn };
    }
    let context = null;
    if (!reasons.length) {
      try {
        validateDefinition(definition);
        context = createGeneratorContext(definition, { generatedAt: '1970-01-01T00:00:00.000Z' });
      } catch (error) { reasons.push('Contexto Forge: ' + error.message); }
    }
    return { table, status: reasons.length ? 'blocked' : 'context-ready',
      contextPrepared: context !== null,
      definitionHash: context?.source.definitionHash || null,
      foreignKeys: context?.foreignKeys.length || 0,
      primaryKeys: context?.primaryKeys.length || 0,
      blockers: [...new Set(reasons)],
      pendingIntegrations: ['Autorización explícita de generación', 'Permisos multitabla',
        'Composición y pruebas de artefactos', 'Frontend de formularios'],
      executable: false, written: 0 };
  });
  const blocked = new Set(resources.map(resource => resource.table));
  for (const resource of adapter.resources) {
    if (resource.enabled && !blocked.has(resource.table)) {
      resources.push({ table: resource.table, status: 'blocked', contextPrepared: false,
        definitionHash: null, foreignKeys: 0, primaryKeys: 0,
        blockers: ['No existe orden de composición seguro'], pendingIntegrations: [],
        executable: false, written: 0 });
    }
  }
  return { kind: 'studio.multitable.engine-bridge', version: 1, mode: 'simulation-only',
    engine: 'createGeneratorContext', resources, orderedTables: [...composition.orderedTables],
    blockers: [...new Set([...composition.blockers, ...adapter.blockers])],
    contextReady: resources.filter(resource => resource.contextPrepared).length,
    readyForGeneration: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    totals: { enabled: adapter.resources.filter(resource => resource.enabled).length,
      inspected: resources.length, written: 0, published: 0 },
    notice: 'Simulación del puente hacia el contexto del motor Forge; no ejecuta generadores, no escribe archivos ni SQL.' };
}
module.exports = { createMultiEngineBridge };
