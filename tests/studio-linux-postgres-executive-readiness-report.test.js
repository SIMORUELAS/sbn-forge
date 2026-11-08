'use strict';

const { buildForgeExecutiveReadinessReport, RISK_CATEGORIES } =
  require('../studio/linux-postgres-executive-readiness-report');
const { REQUIREMENTS } = require('../studio/linux-postgres-evidence-matrix');

test('missing inventory blocks executive review without authorization', () => {
  const report = buildForgeExecutiveReadinessReport();
  expect(report.status).toBe('EXECUTIVE_REVIEW_BLOCKED');
  expect(report.decision).toBe('DO_NOT_PROVISION_OR_RUN_INTEGRATION');
  expect(report.integrationTestsAuthorized).toBe(false);
  expect(report.databaseProvisioned).toBe(false);
});
test('reports all missing evidence and risk categories', () => {
  const report = buildForgeExecutiveReadinessReport();
  expect(report.pendingCount).toBe(REQUIREMENTS.length);
  expect(report.risks).toHaveLength(RISK_CATEGORIES.length);
  expect(report.risks.every(risk => risk.state === 'EVIDENCE_PENDING')).toBe(true);
});
test('rejected recovery evidence is a blocked risk', () => {
  const report = buildForgeExecutiveReadinessReport({ records: [{
    requirementId: 'boundary.backupRestoreVerified', state: 'REJECTED'
  }] });
  expect(report.status).toBe('EXECUTIVE_REVIEW_BLOCKED');
  expect(report.rejectedCount).toBe(1);
  expect(report.risks.find(risk => risk.id === 'BACKUP_AND_RECOVERY').state)
    .toBe('REJECTED');
});
test('recorded review claims are not external audit or administrator approval', () => {
  const records = REQUIREMENTS.map(requirement => ({
    requirementId: requirement.id, state: 'VERIFIED',
    reference: 'AUDIT/2026-001', reviewerId: 'reviewer-01',
    reviewedAt: '2026-11-07T12:00:00Z', independentReview: true
  }));
  const report = buildForgeExecutiveReadinessReport({ records });
  expect(report.reviewedClaimCount).toBe(REQUIREMENTS.length);
  expect(report.externalAuditCompleted).toBe(false);
  expect(report.administratorApprovalGranted).toBe(false);
  expect(report.integrationTestsExecuted).toBe(false);
});
test('sensitive raw data never appears in the executive report', () => {
  const report = buildForgeExecutiveReadinessReport({ records: [{
    requirementId: 'access.nonProduction', state: 'SUBMITTED',
    password: 'secret-password', sshOutput: 'private-server'
  }] });
  expect(JSON.stringify(report)).not.toMatch(/secret-password|private-server/);
});
test('malformed inputs fail closed', () => {
  const report = buildForgeExecutiveReadinessReport({ records: null,
    readinessInput: null });
  expect(report.status).toBe('EXECUTIVE_REVIEW_BLOCKED');
  expect(report.sqlExecuted).toBe(false);
});
