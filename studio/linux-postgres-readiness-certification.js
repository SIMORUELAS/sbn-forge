'use strict';

const { reviewDualChannel } = require('./linux-postgres-dual-channel-review');
const { assessForgeDatabaseBoundary } = require('./linux-postgres-database-boundary');
const { planForgeProvisioning } = require('./linux-postgres-provisioning-plan');

// Offline-only aggregation. No external I/O, credentials, SQL, or authorization.
function certifyForgeIntegrationReadiness({
  ssh = {}, pgadmin = {}, confirmations = {}, inventory,
  context = {}, proposal = {}
} = {}) {
  const dual = reviewDualChannel({ ssh, pgadmin, confirmations });
  let boundary;
  let procedure;
  try {
    boundary = assessForgeDatabaseBoundary({ inventory, context, proposal });
    procedure = planForgeProvisioning({ inventory, context, proposal });
  } catch {
    return {
      status: 'CERTIFICATION_BLOCKED',
      reasons: ['INVALID_OR_MISSING_ISOLATION_INVENTORY'],
      evidenceStatus: dual.status,
      boundaryStatus: 'NOT_EVALUATED',
      procedureStatus: 'NOT_EVALUATED',
      missing: [...dual.missing, ...dual.administrativeConfirmationsMissing],
      blockers: ['INVALID_OR_MISSING_ISOLATION_INVENTORY'],
      targetDatabase: 'sbn_forge_execution_test',
      connectionAttempted: false, databaseProvisioned: false,
      roleProvisioned: false, sqlExecuted: false,
      integrationTestsAuthorized: false, integrationTestsExecuted: false,
      nextStep: 'INDEPENDENT_ADMINISTRATOR_REVIEW_REQUIRED'
    };
  }
  const validStatuses = dual.status === 'DUAL_CHANNEL_REVIEW_READY' &&
    boundary.status === 'BOUNDARY_DESIGN_READY_FOR_INDEPENDENT_REVIEW' &&
    procedure.status === 'PROCEDURE_READY_FOR_ADMINISTRATOR_REVIEW';
  const rejected = boundary.status === 'BOUNDARY_REJECTED' ||
    boundary.status === 'SECURITY_REVIEW_REQUIRED' ||
    boundary.blockers.length > 0 || procedure.blockers.length > 0;
  const missing = [...new Set([
    ...dual.missing, ...dual.administrativeConfirmationsMissing,
    ...boundary.missing, ...procedure.missing
  ])];
  const blockers = [...new Set([...boundary.blockers, ...procedure.blockers])];
  const status = rejected ? 'CERTIFICATION_BLOCKED'
    : validStatuses && missing.length === 0
      ? 'DESIGN_READY_FOR_INDEPENDENT_REVIEW' : 'CERTIFICATION_INCOMPLETE';
  return {
    status,
    reasons: status === 'DESIGN_READY_FOR_INDEPENDENT_REVIEW'
      ? [] : [rejected ? 'ISOLATION_POLICY_REJECTED' : 'EVIDENCE_OR_APPROVALS_INCOMPLETE'],
    evidenceStatus: dual.status,
    boundaryStatus: boundary.status,
    procedureStatus: procedure.status,
    missing, blockers,
    targetDatabase: boundary.targetDatabase,
    connectionAttempted: false, databaseProvisioned: false,
    roleProvisioned: false, sqlExecuted: false,
    integrationTestsAuthorized: false, integrationTestsExecuted: false,
    nextStep: 'INDEPENDENT_ADMINISTRATOR_REVIEW_REQUIRED'
  };
}

module.exports = { certifyForgeIntegrationReadiness };
