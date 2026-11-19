'use strict';
const RULES = [
  { id: 'unsupported-type', severity: 'blocker', test: /tipo PostgreSQL no soportado/i,
    action: 'Revisar el tipo original y añadir compatibilidad explícita al adaptador Forge; no convertir datos automáticamente.' },
  { id: 'metadata', severity: 'blocker', test: /metadatos.*incompletos|faltan propiedades originales/i,
    action: 'Volver a inspeccionar la tabla en modo lectura y verificar los metadatos originales de sus columnas.' },
  { id: 'required-field', severity: 'blocker', test: /campo obligatorio sin regla de creación/i,
    action: 'Revisar obligatoriedad, valores predeterminados y reglas de creación del campo en el diseño.' },
  { id: 'primary-key', severity: 'blocker', test: /falta clave primaria|sin clave primaria/i,
    action: 'Verificar la clave primaria en PostgreSQL y actualizar la definición inspeccionada.' },
  { id: 'circular-dependency', severity: 'blocker', test: /dependencias circulares|orden de composición incompleto/i,
    action: 'Revisar el grafo de claves foráneas y definir una estrategia de composición antes de generar.' },
  { id: 'foreign-key', severity: 'blocker', test: /relación sin restricción|faltan restricciones de claves foráneas/i,
    action: 'Inspeccionar las restricciones de claves foráneas agrupadas y sus columnas de origen y destino.' },
  { id: 'disabled-dependency', severity: 'warning', test: /recurso relacionado deshabilitado|destino deshabilitado/i,
    action: 'Revisar si el recurso relacionado debe habilitarse o mantenerse como dependencia externa.' },
  { id: 'unique-target', severity: 'warning', test: /requiere.*unique|destino no coincide con la clave primaria/i,
    action: 'Verificar la existencia de una restricción UNIQUE en las columnas de destino.' },
  { id: 'compatibility', severity: 'blocker', test: /compatibilidad no confirmada|validador Forge no compatible/i,
    action: 'Revisar el contrato normalizado y las limitaciones del validador Forge.' },
  { id: 'generator-not-connected', severity: 'blocker', test: /no están conectados al generador ejecutable/i,
    action: 'Mantener la generación deshabilitada hasta implementar y validar la integración del motor multitabla.' }
];
function classifyIssue(message, fallback = 'blocker') {
  const rule = RULES.find(item => item.test.test(message));
  return { code: rule?.id || 'manual-review', severity: rule?.severity || fallback,
    message, recommendation: rule?.action ||
      'Revisar el diagnóstico y su evidencia de origen antes de modificar el diseño.' };
}
function createMultiRecommendations(preparation) {
  const global = [
    ...preparation.blockers.map(message => classifyIssue(message)),
    ...preparation.warnings.map(message => classifyIssue(message, 'warning'))
  ];
  const resources = preparation.diagnostics.map(resource => ({
    table: resource.table, enabled: resource.enabled,
    findings: resource.enabled ? [
      ...resource.issues.map(message => classifyIssue(message)),
      ...resource.warnings.map(message => classifyIssue(message, 'warning'))
    ] : []
  }));
  return { kind: 'studio.multitable.recommendations', version: 1, mode: 'review-only',
    global, resources, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false };
}
module.exports = { classifyIssue, createMultiRecommendations };
