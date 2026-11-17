'use strict';
const { validateMultiDefinition } = require('./multi-definition-store');
const { createMultiForgeAdapter } = require('./multi-forge-adapter');
const FILE_CATALOG = require('../src/catalogs/file-catalog');
const KINDS = Object.freeze(['routes', 'controller', 'service', 'repository', 'schema', 'readme', 'manifest']);
function createMultiArtifactInventory(input) {
  const definition = validateMultiDefinition(input);
  const adapter = createMultiForgeAdapter(definition);
  const blockers = [...adapter.blockers];
  const warnings = [...adapter.warnings];
  const artifacts = [];
  const resources = [];
  for (const resource of adapter.resources) {
    const table = definition.tables.find(item => item.name === resource.table);
    const dependencies = definition.foreignKeyGroups.filter(group => group.fromTable === table.name)
      .map(group => ({ constraint: group.name, targetTable: group.toTable,
        columns: group.columns.map(pair => ({ ...pair })),
        targetEnabled: definition.tables.find(item => item.name === group.toTable).settings.resourceEnabled }));
    const issues = [...resource.blockers];
    for (const dependency of dependencies) {
      if (!dependency.targetEnabled) {
        issues.push('Dependencia hacia recurso deshabilitado: ' + dependency.targetTable);
      }
      if (dependency.columns.length > 1) {
        issues.push('Clave foránea compuesta requiere contrato especializado: ' + dependency.constraint);
      }
    }
    const manifest = { table: table.name, enabled: resource.enabled,
      primaryKey: [...table.primaryKey], permissions: [...table.settings.permissions],
      dependencies, compatible: resource.compatible && issues.length === 0,
      blockers: [...new Set(issues)] };
    resources.push(manifest);
    if (!resource.enabled) { continue; }
    blockers.push(...manifest.blockers.map(issue => table.name + ': ' + issue));
    const moduleName = table.name.replace(/_/g, '-');
    for (const kind of KINDS) {
      const entry = FILE_CATALOG[kind];
      if (!entry || (kind !== 'manifest' && !entry.template)) {
        blockers.push(table.name + ': plantilla no disponible: ' + kind);
        continue;
      }
      artifacts.push({ table: table.name, kind,
        path: moduleName + '/' + entry.output.replace(/\{module\}/g, moduleName),
        template: entry.template, category: entry.category,
        action: 'inventory-only', written: false, published: false });
    }
    if (table.settings.formEnabled) {
      warnings.push(table.name + ': formulario sin plantilla ejecutable en el catálogo API.');
    }
  }
  const paths = new Set();
  for (const artifact of artifacts) {
    if (paths.has(artifact.path)) { blockers.push('Ruta de artefacto duplicada: ' + artifact.path); }
    paths.add(artifact.path);
  }
  return { kind: 'studio.multitable.artifact-inventory', version: 1,
    mode: 'inventory-only', resources, artifacts,
    blockers: [...new Set(blockers)], warnings: [...new Set(warnings)],
    totals: { resources: resources.filter(resource => resource.enabled).length,
      catalogArtifacts: artifacts.length, written: 0, published: 0 },
    readyForGeneration: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    notice: 'Inventario del catálogo existente; no ejecuta plantillas, no escribe archivos ni modifica PostgreSQL.' };
}
module.exports = { createMultiArtifactInventory };
