'use strict';

const { certifyForgeIntegrationReadiness } =
  require('../studio/linux-postgres-readiness-certification');
const { REQUIRED: ACCESS_REQUIRED } = require('../studio/linux-postgres-access-evidence');
const { REQUIRED: BOUNDARY_REQUIRED, TARGET } =
  require('../studio/linux-postgres-database-boundary');

const favorable = {
  ssh: {
    hostIdentified: true, postgresServiceObserved: true, firewallReviewed: true,
    hbaReviewed: true, tlsConfigurationReviewed: true
  },
  pgadmin: {
    databaseName: 'postgres', serverVersionNum: 160015, sslActive: true,
    privilegedRole: false, databaseOwnerMember: false,
    canCreateSchema: false, publicCreate: false
  },
  confirmations: Object.fromEntries(ACCESS_REQUIRED.map(key => [key, true])),
  inventory: {
    status: 'READ_ONLY_INVENTORY_COMPLETE', suitableForForgeIntegration: false,
    integrationTestsExecuted: false, sslActive: true, privilegedRole: false,
    databaseOwnerMember: false, canCreateSchema: false, publicCreate: false,
    publicUsage: true
  },
  context: {
    nonProductionConfirmed: true, privateNetworkConfirmed: true,
    existingDatabasesProtected: true, dedicatedDatabaseApproved: true,
    restrictedRunnerApproved: true
  },
  proposal: {
    databaseName: TARGET, usesAdministrativeRole: false,
    crossDatabaseAccessDisabled: true,
    confirmations: Object.fromEntries(BOUNDARY_REQUIRED.map(key => [key, true]))
  }
};

test('missing inventory fails closed and does not authorize', () => {
  const result = certifyForgeIntegrationReadiness();
  expect(result.status).toBe('CERTIFICATION_BLOCKED');
  expect(result.blockers).toContain('INVALID_OR_MISSING_ISOLATION_INVENTORY');
  expect(result.integrationTestsAuthorized).toBe(false);
});
test('SSH or pgAdmin evidence incomplete remains incomplete', () => {
  const result = certifyForgeIntegrationReadiness({ ...favorable, pgadmin: {
    ...favorable.pgadmin, privilegedRole: true, databaseName: 'sbn_portal_test'
  } });
  expect(result.status).toBe('CERTIFICATION_INCOMPLETE');
  expect(result.missing).toContain('pgadminRestrictedRole');
});
test('rejects protected destination regardless of other favorable evidence', () => {
  const result = certifyForgeIntegrationReadiness({ ...favorable, proposal: {
    ...favorable.proposal, databaseName: 'sbn_portal_test'
  } });
  expect(result.status).toBe('CERTIFICATION_BLOCKED');
  expect(result.blockers).toContain('PROTECTED_DATABASE_TARGET');
});
test('missing backup verification remains incomplete', () => {
  const result = certifyForgeIntegrationReadiness({ ...favorable, proposal: {
    ...favorable.proposal, confirmations: {
      ...favorable.proposal.confirmations, backupRestoreVerified: false
    }
  } });
  expect(result.status).toBe('CERTIFICATION_INCOMPLETE');
  expect(result.missing).toContain('backupRestoreVerified');
});
test('favorable claims are review-only and never authorize execution', () => {
  const result = certifyForgeIntegrationReadiness(favorable);
  expect(result.status).toBe('DESIGN_READY_FOR_INDEPENDENT_REVIEW');
  expect(result.databaseProvisioned).toBe(false);
  expect(result.roleProvisioned).toBe(false);
  expect(result.connectionAttempted).toBe(false);
  expect(result.sqlExecuted).toBe(false);
  expect(result.integrationTestsAuthorized).toBe(false);
  expect(result.integrationTestsExecuted).toBe(false);
});
test('sensitive fields are not propagated into output', () => {
  const result = certifyForgeIntegrationReadiness({
    ...favorable, ssh: { ...favorable.ssh, hostname: 'secret-host' },
    proposal: { ...favorable.proposal, password: 'secret-password' }
  });
  expect(JSON.stringify(result)).not.toMatch(/secret-host|secret-password/);
});
