'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { classifyIssue, createMultiRecommendations } = require('../studio/multi-recommendations');
const { createMultiGenerationPlan } = require('../studio/multi-generation-plan');
const col = (name, type = 'uuid') => ({ name, type, nullable: false, defaultValue: null,
  maxLength: null, precision: null, scale: null, identity: false, identityGeneration: null });
const sample = () => ({
  kind: 'studio.multitable.preview', version: 1, mode: 'READ_ONLY_PREVIEW', name: 'sample',
  source: { profile: 'pg_test', schema: 'product_hub' }, primaryTable: 'products',
  tables: [{ name: 'products', columns: [col('id'), col('location', 'point')],
    primaryKey: ['id'], settings: { resourceEnabled: true, formEnabled: false, permissions: ['read'] } }],
  relations: [], foreignKeyGroups: []
});
test('classifies supported issue patterns without making automatic changes', () => {
  expect(classifyIssue('Tipo PostgreSQL no soportado: point')).toMatchObject({
    code: 'unsupported-type', severity: 'blocker' });
  expect(classifyIssue('destino deshabilitado', 'warning')).toMatchObject({
    code: 'disabled-dependency', severity: 'warning' });
  expect(classifyIssue('mensaje desconocido', 'warning')).toMatchObject({
    code: 'manual-review', severity: 'warning' });
});
test('recommendations are deterministic and non-executable', () => {
  const plan = createMultiGenerationPlan(sample());
  const advice = plan.preparation.recommendations;
  expect(advice).toMatchObject({ mode: 'review-only', executable: false,
    generationAuthorized: false, installationAuthorized: false, publicationAuthorized: false });
  expect(advice.resources[0].findings.some(item => item.code === 'unsupported-type')).toBe(true);
  expect(advice.global.some(item => item.code === 'generator-not-connected')).toBe(true);
  expect(advice).toEqual(createMultiRecommendations(plan.preparation));
  expect(createMultiGenerationPlan(sample()).preparation).toEqual(plan.preparation);
});
test('advice is included in preparation evidence and displayed safely', () => {
  const js = fs.readFileSync(path.join(__dirname, '../studio/public/app.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '../studio/public/index.html'), 'utf8');
  const contract = fs.readFileSync(path.join(__dirname, '../studio/multi-preparation-contract.js'), 'utf8');
  expect(contract).toContain('resources, diagnostics, recommendations, orderedTables:');
  expect(html).toContain('id="designer-multi-diagnostics-recommendations"');
  expect(js).toContain("addList('Recomendaciones'");
  expect(js).toContain('item.textContent = value');
});
