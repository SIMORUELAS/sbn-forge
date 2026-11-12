'use strict';

const { assessPortalModuleSecurityContract, OPERATIONS, REQUIREMENTS } =
  require('../studio/portal-module-security-contract');

const baseline = { moduleName: 'product_development_projects', operations: OPERATIONS };

test('missing host contract remains incomplete and cannot authorize installation', () => {
  const result = assessPortalModuleSecurityContract(baseline);
  expect(result.status).toBe('SECURITY_CONTRACT_INCOMPLETE');
  expect(result.missing).toEqual(REQUIREMENTS);
  expect(result.installationAuthorized).toBe(false);
});
test('rejects invalid or incomplete CRUD coverage', () => {
  const result = assessPortalModuleSecurityContract({
    ...baseline, operations: ['list', 'read', 'create', 'update']
  });
  expect(result.status).toBe('SECURITY_CONTRACT_BLOCKED');
  expect(result.blockers).toContain('INVALID_CRUD_OPERATION_SET');
});
test('all declared host controls still require evidence references', () => {
  const result = assessPortalModuleSecurityContract({
    ...baseline, host: Object.fromEntries(REQUIREMENTS.map(id => [id, true]))
  });
  expect(result.status).toBe('SECURITY_CONTRACT_INCOMPLETE');
  expect(result.missing).toEqual(REQUIREMENTS);
});
test('even complete review claims cannot certify runtime protection', () => {
  const result = assessPortalModuleSecurityContract({
    ...baseline,
    host: Object.fromEntries(REQUIREMENTS.map(id => [id, true])),
    evidence: Object.fromEntries(REQUIREMENTS.map(id => [id, {
      reference: 'REVIEW/2026-001', reviewed: true
    }]))
  });
  expect(result.status).toBe('SECURITY_DESIGN_READY_FOR_INDEPENDENT_REVIEW');
  expect(result.effectiveJwtEnforcementVerified).toBe(false);
  expect(result.effectivePermissionsVerified).toBe(false);
  expect(result.effectiveTenantIsolationVerified).toBe(false);
  expect(result.publicationAuthorized).toBe(false);
});
test('invalid evidence and untrusted values fail closed', () => {
  const result = assessPortalModuleSecurityContract({
    ...baseline, host: { jwtVerification: 'true' },
    evidence: { jwtVerification: { reference: '../secrets', reviewed: true } }
  });
  expect(result.missing).toContain('jwtVerification');
  expect(result.installationAuthorized).toBe(false);
});
test('raw secrets never appear in report', () => {
  const result = assessPortalModuleSecurityContract({
    ...baseline, host: { password: 'secret-password' },
    evidence: { jwtVerification: { token: 'secret-token' } }
  });
  expect(JSON.stringify(result)).not.toMatch(/secret-password|secret-token/);
});
