'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createMultiGenerationPlan } = require('./multi-generation-plan');
const { createGeneratorContext } = require('../src/core/generator-context');
const { generateApi } = require('../src/generators/backend/api-generator');

async function generateMultiIsolated(input, options = {}) {
  const plan = createMultiGenerationPlan(input);
  const bridge = plan.bridge;
  if (!bridge || !plan.composition.complete || plan.composition.blockers.length ||
      bridge.contextReady !== bridge.totals.enabled ||
      bridge.resources.some(resource => !resource.contextPrepared) ||
      plan.adapter.blockers.length || plan.compatibility.blockers.length ||
      plan.inventory.blockers.length) {
    throw new Error('Generación multitabla aislada bloqueada: contratos o dependencias incompatibles');
  }
  const root = await fs.mkdtemp(path.join(options.tempRoot || os.tmpdir(), 'sbn-forge-multi-isolated-'));
  try {
    const files = [];
    for (const table of bridge.orderedTables) {
      const adapted = plan.adapter.resources.find(resource => resource.table === table);
      if (!adapted || !adapted.enabled) { throw new Error('Recurso no habilitado: ' + table); }
      const definition = { ...adapted.definition, columns: adapted.definition.columns.map(column => ({ ...column })) };
      for (const group of adapted.foreignKeyGroups) {
        if (group.columns.length !== 1) { throw new Error('Relación compuesta no admitida: ' + group.name); }
        const pair = group.columns[0];
        const column = definition.columns.find(item => item.name === pair.fromColumn);
        if (!column || column.foreignKey) { throw new Error('Relación ambigua: ' + group.name); }
        column.foreignKey = { schema: definition.schema, table: group.toTable, column: pair.toColumn };
      }
      const context = createGeneratorContext(definition, { generatedAt: '1970-01-01T00:00:00.000Z' });
      context.security = { requireJwt: true };
      const generated = await generateApi(context, { output: root, force: false, writeMode: 'create' });
      const expected = plan.inventory.artifacts.filter(item => item.table === table)
        .map(item => 'modules/' + item.path);
      const actual = generated.files.map(item => item.relativePath.replace(/\\/g, '/'));
      if (new Set(actual).size !== expected.length ||
          actual.length !== expected.length ||
          expected.some(item => !actual.includes(item))) {
        throw new Error('Artefactos distintos del inventario para ' + table);
      }
      const manifest = JSON.parse(await fs.readFile(generated.manifestPath, 'utf8'));
      if (!Array.isArray(manifest.files) || manifest.files.length !== actual.length ||
          actual.some(item => !manifest.files.some(file => file.relativePath === item))) {
        throw new Error('Manifiesto inválido para ' + table);
      }
      for (const relative of actual) {
        const absolute = path.resolve(root, relative);
        if (!absolute.startsWith(path.resolve(root) + path.sep)) {
          throw new Error('Ruta fuera del aislamiento');
        }
        const stat = await fs.lstat(absolute);
        if (!stat.isFile() || stat.isSymbolicLink()) {
          throw new Error('Artefacto inválido: ' + relative);
        }
        files.push({ table, path: relative, bytes: stat.size });
      }
    }
    if (new Set(files.map(file => file.path)).size !== files.length) {
      throw new Error('Rutas duplicadas entre módulos');
    }
    return { kind: 'studio.multitable.isolated-generation', mode: 'isolated-local',
      directory: root, orderedTables: [...bridge.orderedTables],
      artifacts: files, totals: { resources: bridge.totals.enabled,
        planned: plan.inventory.artifacts.length, written: files.length, published: 0 },
      databaseModified: false, published: false, installationAuthorized: false,
      publicationAuthorized: false };
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true });
    throw error;
  }
}
module.exports = { generateMultiIsolated };
