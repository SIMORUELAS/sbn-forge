'use strict';

const { assessForgeEvidenceMatrix } = require('./linux-postgres-evidence-matrix');
const { certifyForgeIntegrationReadiness } = require('./linux-postgres-readiness-certification');

const RISK_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'NETWORK_AND_ACCESS', prefixes: ['access.privateNetwork',
    'boundary.privateNetworkRestricted', 'inspection.sshAndPgadmin'] }),
  Object.freeze({ id: 'TLS_IDENTITY', prefixes: ['access.tlsCertificateValidation',
    'boundary.tlsCertificateIdentityVerified'] }),
  Object.freeze({ id: 'LEAST_PRIVILEGE', prefixes: ['access.restrictedInspectionRole',
    'boundary.restrictedRunnerApproval', 'isolation.readOnlyInventory'] }),
  Object.freeze({ id: 'BACKUP_AND_RECOVERY', prefixes: ['boundary.backupRestoreVerified',
    'procedure.rollback'] }),
  Object.freeze({ id: 'DATABASE_AND_RESOURCE_ISOLATION', prefixes: [
    'access.existingDatabaseProtection', 'boundary.existingDatabasesProtected',
    'boundary.dedicatedDatabaseApproval', 'boundary.resourceIsolationReviewed'] })
]);

// Executive summary only. Never reads files, connects to a host, or grants permissions.
function buildForgeExecutiveReadinessReport({ records = [], readinessInput = {} } = {}) {
  let matrix;
  let readiness;
  try {
    matrix = assessForgeEvidenceMatrix({ records, readinessInput });
    readiness = certifyForgeIntegrationReadiness(readinessInput);
  } catch {
    return {
      status: 'EXECUTIVE_REVIEW_BLOCKED',
      decision: 'DO_NOT_PROVISION_OR_RUN_INTEGRATION',
      problems: ['INVALID_ASSESSMENT_INPUT'],
      pendingCount: 0, reviewedClaimCount: 0, rejectedCount: 0,
      risks: RISK_CATEGORIES.map(category => ({ id: category.id, state: 'UNASSESSED' })),
      actions: ['REPEAT_OFFLINE_EVIDENCE_ASSESSMENT'],
      externalAuditCompleted: false, administratorApprovalGranted: false,
      databaseProvisioned: false, roleProvisioned: false,
      connectionAttempted: false, sqlExecuted: false,
      integrationTestsAuthorized: false, integrationTestsExecuted: false
    };
  }
  const rows = matrix.requirements;
  const pending = rows.filter(row => row.state === 'PENDING_INDEPENDENT_REVIEW');
  const rejected = rows.filter(row => row.state === 'REJECTED');
  const reviewed = rows.filter(row => row.state === 'REVIEW_CLAIM_RECORDED');
  const risks = RISK_CATEGORIES.map(category => {
    const relevant = rows.filter(row => category.prefixes.includes(row.requirementId));
    return {
      id: category.id,
      state: relevant.some(row => row.state === 'REJECTED') ? 'REJECTED'
        : relevant.every(row => row.state === 'REVIEW_CLAIM_RECORDED')
          ? 'REVIEW_CLAIMS_RECORDED' : 'EVIDENCE_PENDING'
    };
  });
  const status = matrix.status === 'EVIDENCE_MATRIX_BLOCKED' ||
    readiness.status === 'CERTIFICATION_BLOCKED' ? 'EXECUTIVE_REVIEW_BLOCKED'
    : matrix.status === 'EVIDENCE_CLAIMS_READY_FOR_EXTERNAL_AUDIT' &&
      readiness.status === 'DESIGN_READY_FOR_INDEPENDENT_REVIEW'
      ? 'EXECUTIVE_DESIGN_READY_FOR_EXTERNAL_AUDIT' : 'EXECUTIVE_REVIEW_INCOMPLETE';
  const actions = [
    ...(rejected.length ? ['RESOLVE_REJECTED_EVIDENCE'] : []),
    ...(pending.length ? ['COLLECT_AND_INDEPENDENTLY_REVIEW_MISSING_EVIDENCE'] : []),
    ...(matrix.problems.length ? ['CORRECT_EVIDENCE_RECORD_PROBLEMS'] : []),
    ...(readiness.status !== 'DESIGN_READY_FOR_INDEPENDENT_REVIEW'
      ? ['RESOLVE_READINESS_BOUNDARY_AND_PROCEDURE_FINDINGS'] : []),
    'OBTAIN_EXTERNAL_AUDIT_AND_SEPARATE_ADMINISTRATOR_APPROVAL'
  ];
  return {
    status, decision: 'DO_NOT_PROVISION_OR_RUN_INTEGRATION',
    targetDatabase: 'sbn_forge_execution_test',
    readinessStatus: readiness.status, evidenceMatrixStatus: matrix.status,
    totalRequirements: rows.length, pendingCount: pending.length,
    reviewedClaimCount: reviewed.length, rejectedCount: rejected.length,
    pendingRequirements: pending.map(row => ({
      id: row.requirementId, owner: row.owner, verification: row.verification
    })),
    rejectedRequirements: rejected.map(row => ({
      id: row.requirementId, owner: row.owner
    })),
    risks, problems: [...matrix.problems],
    blockers: [...(readiness.blockers || [])],
    actions,
    externalAuditCompleted: false, administratorApprovalGranted: false,
    databaseProvisioned: false, roleProvisioned: false,
    connectionAttempted: false, sqlExecuted: false,
    integrationTestsAuthorized: false, integrationTestsExecuted: false
  };
}

module.exports = { buildForgeExecutiveReadinessReport, RISK_CATEGORIES };
