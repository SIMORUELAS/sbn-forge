'use strict';
const { assessAccessEvidence } = require('./linux-postgres-access-evidence');

// Only curated, non-sensitive facts are accepted. Never ingest raw SSH output or pgAdmin dumps.
function reviewDualChannel({ ssh = {}, pgadmin = {}, confirmations = {} } = {}) {
  const checks = {
    sshHostIdentified: ssh.hostIdentified === true,
    sshPostgresServiceObserved: ssh.postgresServiceObserved === true,
    sshFirewallReviewed: ssh.firewallReviewed === true,
    sshHbaReviewed: ssh.hbaReviewed === true,
    sshTlsConfigurationReviewed: ssh.tlsConfigurationReviewed === true,
    pgadminMaintenanceDatabase: pgadmin.databaseName === 'postgres',
    pgadminServerVersionObserved: Number.isInteger(pgadmin.serverVersionNum) &&
      pgadmin.serverVersionNum > 0,
    pgadminTlsSession: pgadmin.sslActive === true,
    pgadminRestrictedRole: pgadmin.privilegedRole === false &&
      pgadmin.databaseOwnerMember === false &&
      pgadmin.canCreateSchema === false && pgadmin.publicCreate === false
  };
  const missing = Object.keys(checks).filter(key => !checks[key]);
  const access = assessAccessEvidence({ channel: 'undetermined', confirmations });
  return {
    status: missing.length || access.missing.length
      ? 'DUAL_CHANNEL_EVIDENCE_INCOMPLETE' : 'DUAL_CHANNEL_REVIEW_READY',
    checks, missing,
    administrativeConfirmationsMissing: access.missing,
    tlsCertificateIdentityVerifiedByTool: false,
    connectionAttempted: false, serverModified: false,
    databaseProvisioned: false, integrationTestsAuthorized: false,
    nextStep: 'ADMINISTRATOR_VERIFY_CERTIFICATE_IDENTITY_AND_APPROVE_SEPARATE_READ_ONLY_INSPECTION'
  };
}
module.exports = { reviewDualChannel };
