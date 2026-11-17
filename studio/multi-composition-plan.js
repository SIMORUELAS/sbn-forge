'use strict';
const { validateMultiDefinition } = require('./multi-definition-store');
const { createMultiArtifactInventory } = require('./multi-artifact-inventory');

function createMultiCompositionPlan(input) {
  const definition = validateMultiDefinition(input);
  const inventory = createMultiArtifactInventory(definition);
  const enabled = inventory.resources.filter(resource => resource.enabled);
  const byName = new Map(enabled.map(resource => [resource.table, resource]));
  const blockers = [...inventory.blockers];
  const warnings = [...inventory.warnings];
  const incoming = new Map(enabled.map(resource => [resource.table, new Set()]));
  const outgoing = new Map(enabled.map(resource => [resource.table, new Set()]));
  for (const resource of enabled) {
    for (const dependency of resource.dependencies) {
      if (!byName.has(dependency.targetTable)) {
        blockers.push(resource.table + ': dependencia no habilitada: ' + dependency.targetTable);
        continue;
      }
      if (dependency.targetTable === resource.table) {
        warnings.push(resource.table + ': referencia interna; requiere validación del contrato relacional.');
        continue;
      }
      incoming.get(resource.table).add(dependency.targetTable);
      outgoing.get(dependency.targetTable).add(resource.table);
    }
  }
  const pending = new Map([...incoming].map(([name, dependencies]) => [name, new Set(dependencies)]));
  const batches = [];
  while (pending.size) {
    const ready = [...pending].filter(([, deps]) => deps.size === 0)
      .map(([name]) => name).sort();
    if (!ready.length) {
      blockers.push('Dependencias circulares entre recursos: ' + [...pending.keys()].sort().join(', '));
      break;
    }
    batches.push(ready);
    for (const name of ready) { pending.delete(name); }
    for (const deps of pending.values()) {
      for (const name of ready) { deps.delete(name); }
    }
  }
  const orderedTables = batches.flat();
  const artifacts = orderedTables.flatMap(table =>
    inventory.artifacts.filter(artifact => artifact.table === table)
      .map(artifact => ({ ...artifact, sequence: 0 })));
  artifacts.forEach((artifact, index) => { artifact.sequence = index + 1; });
  const resources = enabled.map(resource => ({
    table: resource.table, primaryKey: [...resource.primaryKey],
    permissions: [...resource.permissions],
    dependsOn: [...incoming.get(resource.table)].sort(),
    requiredBy: [...outgoing.get(resource.table)].sort(),
    batch: batches.findIndex(batch => batch.includes(resource.table)) + 1,
    compatible: resource.compatible
  }));
  return { kind: 'studio.multitable.composition-plan', version: 1,
    mode: 'plan-only', batches, orderedTables, resources, artifacts,
    blockers: [...new Set(blockers)], warnings: [...new Set(warnings)],
    complete: orderedTables.length === enabled.length,
    readyForGeneration: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    totals: { resources: enabled.length, ordered: orderedTables.length,
      catalogArtifacts: artifacts.length, written: 0, published: 0 },
    notice: 'Orden de composición informativo; no genera código, no escribe archivos ni ejecuta SQL.' };
}
module.exports = { createMultiCompositionPlan };
