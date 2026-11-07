'use strict';
const { reviewDualChannel } = require('../studio/linux-postgres-dual-channel-review');
const { REQUIRED } = require('../studio/linux-postgres-access-evidence');
const valid = {
  ssh: { hostIdentified: true, postgresServiceObserved: true, firewallReviewed: true,
    hbaReviewed: true, tlsConfigurationReviewed: true },
  pgadmin: { databaseName: 'postgres', serverVersionNum: 150000, sslActive: true,
    privilegedRole: false, databaseOwnerMember: false, canCreateSchema: false,
    publicCreate: false },
  confirmations: Object.fromEntries(REQUIRED.map(key => [key, true]))
};
test('fails closed when no real evidence is provided', () => {
  const result = reviewDualChannel();
  expect(result.status).toBe('DUAL_CHANNEL_EVIDENCE_INCOMPLETE');
  expect(result.connectionAttempted).toBe(false);
});
test('requires independent SSH and pgAdmin observations', () => {
  const result = reviewDualChannel({ ...valid, ssh: {} });
  expect(result.missing).toContain('sshFirewallReviewed');
  expect(result.status).toBe('DUAL_CHANNEL_EVIDENCE_INCOMPLETE');
});
test('rejects privileged pgAdmin login and non-maintenance database', () => {
  const result = reviewDualChannel({ ...valid, pgadmin: {
    ...valid.pgadmin, databaseName: 'sbn_portal_test', privilegedRole: true
  } });
  expect(result.missing).toEqual(expect.arrayContaining([
    'pgadminMaintenanceDatabase', 'pgadminRestrictedRole'
  ]));
});
test('complete assertions never authorize integration or claim certificate verification', () => {
  const result = reviewDualChannel(valid);
  expect(result.status).toBe('DUAL_CHANNEL_REVIEW_READY');
  expect(result.integrationTestsAuthorized).toBe(false);
  expect(result.tlsCertificateIdentityVerifiedByTool).toBe(false);
});
test('does not include secrets or hostnames in report', () => {
  const result = reviewDualChannel({ ...valid, ssh: { ...valid.ssh, password: 'secret-123',
    hostname: 'sensitive-host' } });
  expect(JSON.stringify(result)).not.toMatch(/secret-123|sensitive-host/);
});
