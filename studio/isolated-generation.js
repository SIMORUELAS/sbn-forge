'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createGenerationPlan } = require('./generation-plan');
const { toForgePreview } = require('./forge-preview');
const { createGeneratorContext } = require('../src/core/generator-context');
const { generateApi } = require('../src/generators/backend/api-generator');

async function generateIsolated(definition, options = {}) {
  const plan = createGenerationPlan(definition);
  if (!plan.readyForGeneration || !plan.compatible || plan.blockers.length) {
    throw new Error('Generación bloqueada: ' + plan.blockers.join('; '));
  }
  const preview = toForgePreview(definition).preview;
  const root = await fs.mkdtemp(path.join(options.tempRoot || os.tmpdir(), 'sbn-forge-studio-'));
  try {
    const context = createGeneratorContext(preview);
    const result = await generateApi(context, { output: root, force: false, writeMode: 'create' });
    const manifest = JSON.parse(await fs.readFile(result.manifestPath, 'utf8'));
    const expected = new Set(plan.artifacts.map(item => 'modules/' + item.path));
    const actual = new Set(result.files.map(item => item.relativePath.replace(/\\/g, '/')));
    if (actual.size !== expected.size || [...expected].some(file => !actual.has(file))) {
      throw new Error('El manifiesto no coincide con el catálogo planificado');
    }
    const verified = [];
    for (const relative of actual) {
      const absolute = path.resolve(root, relative);
      if (!absolute.startsWith(path.resolve(root) + path.sep)) { throw new Error('Ruta fuera del aislamiento'); }
      const stat = await fs.lstat(absolute);
      if (!stat.isFile() || stat.isSymbolicLink()) { throw new Error('Artefacto no válido: ' + relative); }
      verified.push({ path: relative, bytes: stat.size });
    }
    if (!Array.isArray(manifest.files) || manifest.files.length !== actual.size) {
      throw new Error('Manifiesto incompleto');
    }
    const manifestPaths = new Set(manifest.files.map(item => item.relativePath));
    if (manifestPaths.size !== actual.size || [...actual].some(file => !manifestPaths.has(file))) {
      throw new Error('Archivos del manifiesto no coinciden con los archivos generados');
    }
    return {
      name: plan.name, directory: root, mode: 'isolated-local',
      published: false, databaseModified: false,
      totals: { planned: expected.size, written: verified.length, published: 0 },
      artifacts: verified.sort((a, b) => a.path.localeCompare(b.path))
    };
  } catch (error) {
    await fs.rm(root, { recursive: true, force: true });
    throw error;
  }
}
module.exports = { generateIsolated };
