'use strict';

// Offline evidence checklist. Assertions are supplied by an administrator, never inferred.
const REQUIRED = Object.freeze([
  'nonProduction', 'existingDatabaseProtection', 'privateNetwork',
  'tlsCertificateValidation', 'restrictedInspectionRole', 'approvedReadOnlyInspection'
]);
const CHANNELS = Object.freeze(['ssh', 'pgadmin', 'undetermined']);

function assessAccessEvidence(evidence = {}) {
  const channel = CHANNELS.includes(evidence.channel) ? evidence.channel : 'undetermined';
  const confirmations = evidence.confirmations && typeof evidence.confirmations === 'object' &&
    !Array.isArray(evidence.confirmations) ? evidence.confirmations : {};
  const confirmed = REQUIRED.filter(key => confirmations[key] === true);
  const missing = REQUIRED.filter(key => confirmations[key] !== true);
  return {
    status: missing.length ? 'EVIDENCE_INCOMPLETE' : 'EVIDENCE_READY_FOR_ADMIN_REVIEW',
    channel, confirmed, missing,
    requiresHostAdministratorReview: true,
    hostChecks: ['OS_AND_FIREWALL_CONFIGURATION', 'POSTGRESQL_LISTEN_AND_HBA',
      'TLS_CERTIFICATE_CHAIN_AND_HOSTNAME', 'BACKUP_AND_RESTORE_OWNERSHIP'],
    connectionAttempted: false,
    serverModified: false,
    databaseProvisioned: false,
    inspectionAuthorizedByTool: false,
    integrationTestsAuthorized: false,
    nextStep: 'INDEPENDENT_ADMINISTRATOR_APPROVAL'
  };
}

if (require.main === module) {
  // No secret-bearing input or file loading; use exported function for explicit in-memory evidence.
  process.stdout.write(JSON.stringify(assessAccessEvidence(), null, 2) + '\n');
}
module.exports = { assessAccessEvidence, REQUIRED };
