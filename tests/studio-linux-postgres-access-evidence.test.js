'use strict';
const { assessAccessEvidence, REQUIRED } = require('../studio/linux-postgres-access-evidence');

test('unknown access channel fails closed without touching server', () => {
  const result = assessAccessEvidence();
  expect(result.status).toBe('EVIDENCE_INCOMPLETE');
  expect(result.channel).toBe('undetermined');
  expect(result.missing).toEqual(REQUIRED);
  expect(result.connectionAttempted).toBe(false);
});
test.each(['ssh', 'pgadmin'])('supports %s as an evidence channel without automatic approval', channel => {
  const result = assessAccessEvidence({
    channel, confirmations: Object.fromEntries(REQUIRED.map(key => [key, true]))
  });
  expect(result.status).toBe('EVIDENCE_READY_FOR_ADMIN_REVIEW');
  expect(result.inspectionAuthorizedByTool).toBe(false);
  expect(result.integrationTestsAuthorized).toBe(false);
  expect(result.serverModified).toBe(false);
});
test('rejects unconfirmed and truthy string assertions', () => {
  const result = assessAccessEvidence({
    channel: 'pgadmin', confirmations: { nonProduction: 'true', privateNetwork: true }
  });
  expect(result.missing).toContain('nonProduction');
  expect(result.confirmed).toEqual(['privateNetwork']);
});
test('does not emit secrets or connection metadata from arbitrary evidence', () => {
  const result = assessAccessEvidence({
    channel: 'ssh', password: 'secret-example', hostname: 'private.example',
    confirmations: { nonProduction: true, token: 'secret-example' }
  });
  expect(JSON.stringify(result)).not.toMatch(/secret-example|private\.example/);
});
