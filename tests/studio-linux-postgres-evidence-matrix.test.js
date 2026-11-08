'use strict';

const { assessForgeEvidenceMatrix, REQUIREMENTS } =
  require('../studio/linux-postgres-evidence-matrix');

test('empty evidence stays blocked when inventory is unavailable', () => {
  const result = assessForgeEvidenceMatrix();
  expect(result.status).toBe('EVIDENCE_MATRIX_BLOCKED');
  expect(result.missing).toHaveLength(REQUIREMENTS.length);
  expect(result.integrationTestsAuthorized).toBe(false);
});
test('a boolean verification without provenance is not accepted', () => {
  const result = assessForgeEvidenceMatrix({ records: [{
    requirementId: REQUIREMENTS[0].id, state: 'VERIFIED', independentReview: true
  }] });
  expect(result.problems).toContain('UNSUPPORTED_VERIFICATION_CLAIM');
  expect(result.missing).toContain(REQUIREMENTS[0].id);
});
test('rejects duplicate and unknown requirement identifiers', () => {
  const record = { requirementId: REQUIREMENTS[0].id, state: 'SUBMITTED' };
  const result = assessForgeEvidenceMatrix({ records: [record, record, {
    requirementId: 'arbitrary.securityBypass', state: 'VERIFIED'
  }] });
  expect(result.problems).toContain('INVALID_OR_DUPLICATE_EVIDENCE_RECORD');
});
test('rejected evidence always blocks', () => {
  const result = assessForgeEvidenceMatrix({ records: [{
    requirementId: REQUIREMENTS[0].id, state: 'REJECTED'
  }] });
  expect(result.status).toBe('EVIDENCE_MATRIX_BLOCKED');
});
test('review claims never become administrator approval', () => {
  const records = REQUIREMENTS.map(requirement => ({
    requirementId: requirement.id, state: 'VERIFIED', reference: 'AUDIT/2026-001',
    reviewerId: 'reviewer-01', reviewedAt: '2026-11-07T12:00:00Z',
    independentReview: true
  }));
  const result = assessForgeEvidenceMatrix({ records });
  expect(result.missing).toEqual([]);
  expect(result.externalAuditCompleted).toBe(false);
  expect(result.administratorApprovalGranted).toBe(false);
  expect(result.integrationTestsAuthorized).toBe(false);
});
test('never propagates raw evidence, secrets, or reviewer identities', () => {
  const result = assessForgeEvidenceMatrix({ records: [{
    requirementId: REQUIREMENTS[0].id, state: 'VERIFIED',
    reference: 'AUDIT/2026-001', reviewerId: 'reviewer-01',
    reviewedAt: '2026-11-07T12:00:00Z', independentReview: true,
    password: 'secret-password', sshOutput: 'sensitive-host'
  }] });
  expect(JSON.stringify(result)).not.toMatch(/secret-password|sensitive-host|reviewer-01/);
});
