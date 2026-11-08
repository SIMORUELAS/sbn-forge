'use strict';

const { REQUIRED: ACCESS } = require('./linux-postgres-access-evidence');
const { REQUIRED: BOUNDARY } = require('./linux-postgres-database-boundary');
const { certifyForgeIntegrationReadiness } = require('./linux-postgres-readiness-certification');

const REQUIREMENTS = Object.freeze([
  ...ACCESS.map(id => Object.freeze({ id: 'access.' + id, owner: 'HOST_ADMINISTRATOR',
    verification: 'INDEPENDENT_ADMINISTRATOR_RECORD' })),
  ...BOUNDARY.map(id => Object.freeze({ id: 'boundary.' + id, owner: 'HOST_ADMINISTRATOR',
    verification: 'INDEPENDENT_SECURITY_OR_RECOVERY_RECORD' })),
  Object.freeze({ id: 'inspection.sshAndPgadmin', owner: 'SECURITY_REVIEWER',
    verification: 'REDACTED_DUAL_CHANNEL_INSPECTION' }),
  Object.freeze({ id: 'isolation.readOnlyInventory', owner: 'SECURITY_REVIEWER',
    verification: 'REDACTED_RESTRICTED_ROLE_INVENTORY' }),
  Object.freeze({ id: 'procedure.rollback', owner: 'RECOVERY_OWNER',
    verification: 'RESTORE_AND_ROLLBACK_REVIEW' })
]);
const STATES = Object.freeze(['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED']);
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._/-]{2,79}$/;

// Records are references to separately controlled, redacted evidence, never raw evidence.
// A VERIFIED record is only a review claim, not cryptographic proof or an approval.
function assessForgeEvidenceMatrix({ records = [], readinessInput = {} } = {}) {
  const byId = new Map();
  const malformed = new Set();
  if (!Array.isArray(records)) {
    malformed.add('INVALID_EVIDENCE_RECORD_COLLECTION');
  } else {
    for (const record of records) {
      if (!record || typeof record !== 'object' || Array.isArray(record) ||
          !REQUIREMENTS.some(item => item.id === record.requirementId) ||
          byId.has(record.requirementId)) {
        malformed.add('INVALID_OR_DUPLICATE_EVIDENCE_RECORD');
        continue;
      }
      byId.set(record.requirementId, record);
    }
  }
  const rows = REQUIREMENTS.map(requirement => {
    const record = byId.get(requirement.id);
    const state = record && STATES.includes(record.state) ? record.state : 'PENDING';
    const referenceValid = record && typeof record.reference === 'string' &&
      REFERENCE.test(record.reference) && !record.reference.includes('..');
    const reviewerValid = record && typeof record.reviewerId === 'string' &&
      REFERENCE.test(record.reviewerId);
    const reviewedAtValid = record && typeof record.reviewedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(record.reviewedAt) &&
      !Number.isNaN(Date.parse(record.reviewedAt));
    const complete = state === 'VERIFIED' && referenceValid && reviewerValid &&
      reviewedAtValid && record.independentReview === true;
    if (state === 'VERIFIED' && !complete) {
      malformed.add('UNSUPPORTED_VERIFICATION_CLAIM');
    }
    return {
      requirementId: requirement.id, owner: requirement.owner,
      verification: requirement.verification,
      state: complete ? 'REVIEW_CLAIM_RECORDED' : state === 'REJECTED'
        ? 'REJECTED' : 'PENDING_INDEPENDENT_REVIEW'
    };
  });
  let readiness;
  try {
    readiness = certifyForgeIntegrationReadiness(readinessInput);
  } catch {
    malformed.add('READINESS_EVALUATION_FAILED');
    readiness = { status: 'CERTIFICATION_BLOCKED' };
  }
  const rejected = rows.some(row => row.state === 'REJECTED');
  const allReviewed = rows.every(row => row.state === 'REVIEW_CLAIM_RECORDED');
  const status = malformed.size || rejected || readiness.status === 'CERTIFICATION_BLOCKED'
    ? 'EVIDENCE_MATRIX_BLOCKED'
    : allReviewed && readiness.status === 'DESIGN_READY_FOR_INDEPENDENT_REVIEW'
      ? 'EVIDENCE_CLAIMS_READY_FOR_EXTERNAL_AUDIT' : 'EVIDENCE_MATRIX_INCOMPLETE';
  return {
    status, readinessStatus: readiness.status,
    requirements: rows,
    problems: [...malformed].sort(),
    missing: rows.filter(row => row.state !== 'REVIEW_CLAIM_RECORDED')
      .map(row => row.requirementId),
    reviewClaimsAreIndependentProof: false,
    externalAuditCompleted: false,
    administratorApprovalGranted: false,
    databaseProvisioned: false, roleProvisioned: false,
    connectionAttempted: false, sqlExecuted: false,
    integrationTestsAuthorized: false, integrationTestsExecuted: false,
    nextStep: 'INDEPENDENT_EVIDENCE_AUDIT_AND_SEPARATE_ADMINISTRATOR_APPROVAL'
  };
}

module.exports = { assessForgeEvidenceMatrix, REQUIREMENTS, STATES };
