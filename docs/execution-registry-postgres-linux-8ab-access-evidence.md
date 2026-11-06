# Macro-block 8AB — Access-channel evidence checklist

**Scope:** offline-only evidence assessment. No network connection, SSH, pgAdmin automation, SQL, provisioning, role change or authorization marker.

Run `node studio/linux-postgres-access-evidence.js` to view an empty checklist. The module's exported `assessAccessEvidence({ channel, confirmations })` supports `ssh`, `pgadmin`, or `undetermined`. Every confirmation requires an explicit boolean `true`; missing values are not approved. Do not include secrets, addresses or personal data in the evidence object.

## SSH path

With separate administrator authorization, collect evidence of server purpose, OS and firewall posture, PostgreSQL listen and `pg_hba.conf` restrictions, TLS certificate chain and hostname validation, backup/restore responsibility, and existence of a restricted inspection login. The 8AB tool does not execute commands remotely.

## pgAdmin-only path

With separate authorization, use connection properties and permitted read-only catalog queries to document PostgreSQL version, selected database, TLS session encryption and inspection-role privileges. pgAdmin alone cannot establish the host firewall, OS configuration, certificate identity verification or backup ownership. Ask the host administrator to confirm these separately. Do not change connection SSL verification settings to bypass certificate validation.

## Approval boundaries

The maintenance database `postgres` may be used for an independently authorized read-only inventory, not for integration tests. Existing `sbn_portal_test` must remain untouched. A future `sbn_forge_execution_test` and restricted runner require separate provisioning approval and the existing execution registry guard/preflight. Even complete evidence yields only `EVIDENCE_READY_FOR_ADMIN_REVIEW`, not permission to connect or execute tests.

Local validation: `npm run lint`, `npm test`, and `node studio/linux-postgres-access-evidence.js`.
