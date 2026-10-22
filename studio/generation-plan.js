'use strict';
const { toForgePreview } = require('./forge-preview');
const { createGeneratorContext } = require('../src/core/generator-context');
const { generateApi } = require('../src/generators/backend/api-generator');
const FILE_CATALOG = require('../src/catalogs/file-catalog');

const GENERIC_KEYS = ['routes', 'controller', 'service', 'repository', 'schema', 'readme'];
function createGenerationPlan(definition) {
  const result = toForgePreview(definition);
  const blockers = [...result.blockers];
  let context = null;
  if (result.readyForGeneration) {
    try {
      context = createGeneratorContext(result.preview, { generatedAt: '1970-01-01T00:00:00.000Z' });
    } catch (error) { blockers.push('No se pudo preparar el contexto Forge: ' + error.message); }
  }
  const moduleName = context?.names?.moduleName || result.preview.table.replace(/_/g, '-');
  const artifacts = [...GENERIC_KEYS, 'manifest'].map(key => {
    const item = FILE_CATALOG[key];
    if (!item || (key !== 'manifest' && !item.template)) {
      blockers.push('Falta plantilla real en catálogo: ' + key);
      return { kind: key, path: null, action: 'unavailable', description: 'Plantilla no disponible' };
    }
    return {
      kind: key,
      path: moduleName + '/' + item.output.replace(/\{module\}/g, moduleName),
      template: item.template,
      category: item.category,
      generator: 'generateApi',
      action: 'planned',
      description: key === 'manifest' ? 'Manifiesto del módulo' : 'Plantilla existente del catálogo Forge'
    };
  });
  return {
    name: result.name,
    source: { schema: result.preview.schema, table: result.preview.table },
    compatible: result.compatible,
    readyForGeneration: result.readyForGeneration && blockers.length === 0,
    executable: false,
    mode: 'plan-only',
    engine: { api: typeof generateApi === 'function' ? 'generateApi' : 'unavailable', profile: 'generic' },
    integrations: [{ target: 'Forge Runtime frontend', status: 'not-mapped', reason: 'No forma parte del catálogo de generateApi' }],
    blockers,
    warnings: result.warnings,
    artifacts,
    totals: { planned: artifacts.filter(item => item.action === 'planned').length, written: 0, published: 0 },
    notice: 'Inventario de plantillas reales; no ejecuta generadores, no escribe archivos, no modifica bases de datos ni publica código.'
  };
}
module.exports = { createGenerationPlan };
