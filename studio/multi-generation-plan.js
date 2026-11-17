'use strict';
const { validateMultiDefinition } = require('./multi-definition-store');
const { createGenerationPlan } = require('./generation-plan');
const { createMultiResourceContracts } = require('./multi-resource-contracts');
const { assessMultiCompatibility } = require('./multi-compatibility-assessment');
const { createMultiForgeAdapter } = require('./multi-forge-adapter');
const { createMultiArtifactInventory } = require('./multi-artifact-inventory');
const { createMultiCompositionPlan } = require('./multi-composition-plan');
const AUDIT = /^(created_at|created_by|updated_at|updated_by|deleted_at|deleted_by)$/;
function createMultiGenerationPlan(input) {
  const definition = validateMultiDefinition(input);
  const contractPreview = createMultiResourceContracts(definition);
  const compatibility = assessMultiCompatibility(definition);
  const adapter = createMultiForgeAdapter(definition);
  const inventory = createMultiArtifactInventory(definition);
  const composition = createMultiCompositionPlan(definition);
  const blockers = [...new Set([...contractPreview.blockers, ...compatibility.blockers, ...adapter.blockers, ...inventory.blockers, ...composition.blockers])];
  const warnings = [...new Set([...contractPreview.warnings, ...compatibility.warnings, ...inventory.warnings, ...composition.warnings])];
  const resources = [];
  const artifacts = [];
  const relations = definition.relations.map(relation => ({ ...relation, status: 'validated' }));
  for (const table of definition.tables) {
    const settings = table.settings;
    const keys = new Set(table.primaryKey);
    const fields = table.columns.map(column => {
      const protectedField = keys.has(column.name) || AUDIT.test(column.name);
      const config = table.fieldSettings[column.name] || {
        visible: true, editable: !protectedField, required: !protectedField && !column.nullable
      };
      return { ...column, ...config, protected: protectedField };
    });
    if (!table.primaryKey.length) { blockers.push(table.name + ': falta clave primaria'); }
    if (table.primaryKey.length > 1) {
      warnings.push(table.name + ': clave primaria compuesta; requiere contrato de rutas y operaciones específico.');
    }
    if (!settings.resourceEnabled) { warnings.push(table.name + ': recurso deshabilitado por configuración.'); }
    const outgoing = relations.filter(relation => relation.fromTable === table.name);
    const resource = { table: table.name, label: settings.label, enabled: settings.resourceEnabled,
      formEnabled: settings.formEnabled, permissions: [...settings.permissions],
      primaryKey: [...table.primaryKey], fields, relations: outgoing };
    resources.push(resource);
    if (!resource.enabled) { continue; }
    const prefix = table.name.replace(/_/g, '-');
    for (const kind of ['routes', 'controller', 'service', 'repository', 'schema', 'readme', 'manifest']) {
      artifacts.push({ table: table.name, kind, path: prefix + '/' + kind,
        action: 'proposed', written: false, published: false });
    }
    if (resource.formEnabled) {
      artifacts.push({ table: table.name, kind: 'form', path: prefix + '/form',
        action: 'proposed', written: false, published: false });
    }
  }
  const enabled = resources.filter(resource => resource.enabled);
  if (!enabled.length) { blockers.push('No hay recursos habilitados'); }
  for (const relation of relations) {
    const source = resources.find(resource => resource.table === relation.fromTable);
    const target = resources.find(resource => resource.table === relation.toTable);
    if (!source?.enabled || !target?.enabled) {
      warnings.push('Relación con recurso deshabilitado: ' + relation.fromTable + ' → ' + relation.toTable);
    }
  }
  // Existing single-table generation contracts require richer source metadata.
  // Do not represent projected artifacts as executable or ready for generation.
  blockers.push('Los contratos normalizados aún no están conectados al generador ejecutable Forge.');
  return {
    kind: 'studio.multitable.generation-plan', version: 1, name: definition.name,
    source: definition.source, primaryTable: definition.primaryTable,
    mode: 'plan-only', executable: false, readyForGeneration: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false,
    engine: { singleTable: typeof createGenerationPlan === 'function' ? 'existing' : 'unavailable',
      multiTable: 'not-connected' },
    resources, relations, resourceContracts: contractPreview.contracts, compatibility, adapter, inventory, composition, blockers, warnings, artifacts,
    totals: { tables: definition.tables.length, resources: enabled.length,
      proposed: artifacts.length, written: 0, published: 0 },
    notice: 'Plan de diseño solamente. No genera archivos, no ejecuta SQL y no instala ni publica módulos.'
  };
}
module.exports = { createMultiGenerationPlan };
