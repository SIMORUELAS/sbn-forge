'use strict';
const { parseTarget } = require('./linux-postgres-readonly-inventory');

// Offline configuration gate: no socket, Pool, query or credentials in output.
function inspectReadiness(env = process.env) {
  let targetValidated = false;
  let reason = null;
  try {
    const target = parseTarget(env);
    targetValidated = target.expected === 'postgres';
    if (!targetValidated) { reason = 'MAINTENANCE_DATABASE_REQUIRED'; }
  } catch (error) {
    const allowed = new Set([
      'LINUX_INSPECTION_URL_REQUIRED', 'INVALID_LINUX_INSPECTION_URL',
      'POSTGRESQL_URL_REQUIRED', 'EXACT_INSPECTION_DATABASE_REQUIRED',
      'EXPLICIT_HOST_AND_PORT_REQUIRED'
    ]);
    reason = allowed.has(error.message) ? error.message : 'INVALID_INSPECTION_CONFIGURATION';
  }
  const checks = {
    exactMaintenanceDatabase: targetValidated,
    restrictedInspectionLoginConfirmed: env.SBN_FORGE_LINUX_RESTRICTED_LOGIN_CONFIRMED === 'true',
    networkApproved: env.SBN_FORGE_LINUX_NETWORK_APPROVED === 'true',
    tlsVerificationApproved: env.SBN_FORGE_LINUX_TLS_VERIFIED === 'true',
    nonProductionConfirmed: env.SBN_FORGE_LINUX_NONPRODUCTION_CONFIRMED === 'true'
  };
  const missing = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
  return {
    status: missing.length ? 'INSPECTION_NOT_READY' : 'INSPECTION_CONFIGURATION_READY',
    checks, missing, reason,
    connectionAttempted: false, inspectionExecuted: false,
    databaseProvisioned: false, integrationTestsAuthorized: false,
    nextStep: 'OBTAIN_SEPARATE_APPROVAL_BEFORE_RUNNING_READ_ONLY_INVENTORY'
  };
}

if (require.main === module) {
  process.stdout.write(JSON.stringify(inspectReadiness(), null, 2) + '\n');
}
module.exports = { inspectReadiness };
