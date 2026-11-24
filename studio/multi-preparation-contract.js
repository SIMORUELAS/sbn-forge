'use strict';
const crypto = require('node:crypto');
const { createMultiRecommendations } = require('./multi-recommendations');

function createMultiPreparationContract(plan) {
  if (!plan || plan.kind !== 'studio.multitable.generation-plan' ||
      plan.mode !== 'plan-only' || plan.executable !== false ||
      plan.generationAuthorized !== false || plan.installationAuthorized !== false ||
      plan.publicationAuthorized !== false || !plan.composition || !plan.inventory ||
      !plan.adapter || !plan.compatibility || !Array.isArray(plan.resourceContracts)) {
    throw new Error('Plan multitabla no seguro o incompleto');
  }
  const blockers = [...new Set(plan.blockers)];
  const warnings = [...new Set(plan.warnings)];
  const enabled = plan.resources.filter(resource => resource.enabled);
  const byTable = new Map(plan.composition.resources.map(resource => [resource.table, resource]));
  const contracts = new Map(plan.resourceContracts.map(contract => [contract.name, contract]));
  const resources = enabled.map(resource => {
    const composition = byTable.get(resource.table);
    const contract = contracts.get(resource.table);
    const inventory = plan.inventory.resources.find(item => item.table === resource.table);
    if (!composition || !contract || !inventory) {
      blockers.push(resource.table + ': contrato de preparación incompleto');
    }
    return { table: resource.table, primaryKey: [...resource.primaryKey],
      permissions: [...resource.permissions], formEnabled: resource.formEnabled,
      batch: composition?.batch || null, dependsOn: composition?.dependsOn || [],
      metadataComplete: contract?.fields.every(field => field.metadataComplete) === true,
      compatible: inventory?.compatible === true && composition?.compatible === true,
      artifacts: plan.inventory.artifacts.filter(artifact => artifact.table === resource.table)
        .map(artifact => ({ kind: artifact.kind, path: artifact.path, template: artifact.template })) };
  });
  const diagnostics = plan.resourceContracts.map(contract => {
    const table = contract.name;
    const assessment = plan.compatibility.resources.find(item => item.table === table);
    const inventory = plan.inventory.resources.find(item => item.table === table);
    const composition = byTable.get(table);
    const fields = contract.fields.map(field => {
      const issues = [];
      if (!field.metadataComplete) { issues.push('Metadatos PostgreSQL incompletos'); }
      if (field.type === 'unsupported') { issues.push('Tipo PostgreSQL no soportado: ' + field.sourceType); }
      if (contract.enabled && !field.nullable && !field.protected && field.editable &&
          !field.required && field.defaultValue === null && !field.identity) {
        issues.push('Campo obligatorio sin regla de creación');
      }
      return { name: field.name, sourceType: field.sourceType, mappedType: field.type,
        metadataComplete: field.metadataComplete, protected: field.protected,
        visible: field.visible, editable: field.editable, required: field.required,
        issues };
    });
    const relations = contract.foreignKeyGroups.map(group => ({
      name: group.name, targetTable: group.toTable,
      columns: group.columns.map(pair => ({ ...pair })),
      composite: group.columns.length > 1,
      targetEnabled: plan.resources.some(item => item.table === group.toTable && item.enabled)
    }));
    const issues = [...new Set([
      ...fields.flatMap(field => field.issues.map(issue => field.name + ': ' + issue)),
      ...(inventory?.blockers || []),
      ...plan.blockers.filter(message => message.startsWith(table + ':') ||
        message.startsWith(table + '.') || relations.some(relation => message.startsWith(relation.name + ':'))),
      ...(contract.enabled && assessment?.forgeValidatorCompatible === false ?
        ['Validador Forge no compatible'] : []),
      ...(contract.enabled && !composition ? ['Recurso sin orden de composición'] : [])
    ])];
    const notices = [...new Set(plan.warnings.filter(message =>
      message.startsWith(table + ':') || message.startsWith(table + '.') ||
      relations.some(relation => message.startsWith(relation.name + ':'))))];
    return { table, enabled: contract.enabled, keyStrategy: contract.keyStrategy,
      primaryKey: [...contract.primaryKey], permissions: [...contract.permissions],
      formEnabled: contract.form.enabled, metadataComplete: fields.every(field => field.metadataComplete),
      forgeValidatorCompatible: assessment?.forgeValidatorCompatible === true,
      compatible: inventory?.compatible === true && assessment?.forgeValidatorCompatible === true,
      batch: composition?.batch || null, dependsOn: composition?.dependsOn || [],
      fields, relations, artifacts: (inventory?.enabled ? plan.inventory.artifacts.filter(item =>
        item.table === table).map(item => ({ kind: item.kind, path: item.path })) : []),
      issues, warnings: notices,
      status: !contract.enabled ? 'disabled' : issues.length ? 'blocked' : 'review'
    };
  });
  const ordered = plan.composition.orderedTables;
  if (!plan.composition.complete || ordered.length !== enabled.length ||
      new Set(ordered).size !== ordered.length) {
    blockers.push('Orden de composición incompleto o duplicado');
  }
  for (const resource of resources) {
    if (!resource.metadataComplete) {
      blockers.push(resource.table + ': metadatos PostgreSQL incompletos');
    }
    if (!resource.compatible) {
      blockers.push(resource.table + ': compatibilidad no confirmada');
    }
  }
  const recommendations = createMultiRecommendations({
    blockers: [...new Set(blockers)], warnings, diagnostics
  });
  const referentialPolicy = {
    mode: 'review-only', status: 'blocked',
    blockers: [...new Set(['Certificación referencial PostgreSQL pendiente',
      ...(plan.referentialPolicy?.blockers || [])])],
    installationAuthorized: false, publicationAuthorized: false
  };
  const evidence = { referentialPolicy, source: plan.source, name: plan.name, primaryTable: plan.primaryTable,
    resources, diagnostics, recommendations, orderedTables: [...ordered],
    artifacts: plan.composition.artifacts.map(item => ({ table: item.table,
      kind: item.kind, path: item.path, sequence: item.sequence })) };
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
  return { kind: 'studio.multitable.preparation-contract', version: 1,
    mode: 'review-only', name: plan.name, source: { ...plan.source },
    fingerprintAlgorithm: 'sha256', fingerprint, resources,
    orderedTables: [...ordered], batches: plan.composition.batches.map(batch => [...batch]),
    diagnostics, recommendations, referentialPolicy,
    artifacts: evidence.artifacts, blockers: [...new Set(blockers)],
    warnings, structurallyComplete: blockers.length === 0,
    readyForGeneration: false, executable: false, generationAuthorized: false,
    installationAuthorized: false, publicationAuthorized: false,
    totals: { resources: enabled.length, ordered: ordered.length,
      artifacts: evidence.artifacts.length, written: 0, published: 0 },
    notice: 'Contrato de revisión solamente. La huella identifica el plan, no autoriza generación, SQL ni despliegue.' };
}
module.exports = { createMultiPreparationContract };
