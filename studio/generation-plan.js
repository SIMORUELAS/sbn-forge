'use strict';
const { toForgePreview } = require('./forge-preview');

function createGenerationPlan(definition) {
  const result = toForgePreview(definition);
  const resource = result.preview.table;
  const base = 'src/generated/' + result.preview.schema + '/' + resource;
  const artifacts = [
    { kind: 'definition', path: base + '.definition.json', action: 'planned', description: 'Contrato Forge normalizado' },
    { kind: 'api', path: base + '.api.js', action: 'planned', description: 'API y rutas del recurso' },
    { kind: 'runtime', path: base + '.resource.js', action: 'planned', description: 'Recurso de interfaz Forge Runtime' },
    { kind: 'tests', path: 'tests/generated/' + resource + '.test.js', action: 'planned', description: 'Pruebas del recurso' },
    { kind: 'docs', path: 'docs/generated/' + resource + '.md', action: 'planned', description: 'Documentación técnica' }
  ];
  return {
    name: result.name,
    source: { schema: result.preview.schema, table: resource },
    compatible: result.compatible,
    readyForGeneration: result.readyForGeneration,
    executable: false,
    mode: 'plan-only',
    blockers: result.blockers,
    warnings: result.warnings,
    artifacts,
    totals: { planned: artifacts.length, written: 0, published: 0 },
    notice: 'Plan informativo: no ejecuta generadores, no escribe archivos, no modifica bases de datos ni publica código.'
  };
}
module.exports = { createGenerationPlan };
