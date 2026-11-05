# Macro-block 8V — Administrative approval dossier

**Status: PENDING INDEPENDENT APPROVAL. This document is a decision record template, not an approval.**

## Existing verified technical baseline (operator results, 2026-11-05)

- 8Q: 9 PASS, 2 deliberately BLOCKED; PostgreSQL 15 binaries found, existing service running, proposed service/port/data path free.
- 8R: 7 PASS, 3 deliberately BLOCKED; data path separate, >=5 GiB available (not capacity approval), no existing ancestor reparse points detected.
- 8U: `Plan` and `Preflight` returned `ProvisioningAuthorized=false`, `ProvisioningPerformed=false`, `TestExecutionAuthorized=false`.
- The 8Q/8R blocks overlap. Do **not** interpret five blocked checks as five independent approvals.
- Results describe a point-in-time observation, not a permanent guarantee. Recheck collisions immediately before a separately authorized installation.

## Decision register — fill outside Git with the authorized administrator

| Gate | Proposed policy | Decision / evidence required | State |
|---|---|---|---|
| Windows service identity | Dedicated non-admin account, no interactive access | Exact account chosen by administrator; service logon right; credential rotation and account lifecycle | PENDING |
| NTFS and path isolation | New directory `C:\SBN\PostgreSQL15-Forge-Test`; restricted owner/ACL; no access to existing cluster data | Approved owner, ACL entries, inheritance/reparse assessment, service account access to binaries and new log directory | PENDING |
| Capacity and backup | Size for expected test growth; separately protected backup if required | Actual free-space sizing, RPO/RTO, backup retention/destination, restore validation and recovery owner | PENDING |
| Network and authentication | Loopback only on port 5433; `scram-sha-256` and narrow `pg_hba.conf` | Approved listener addresses, IPv6 handling, credential delivery and authentication rule order | PENDING |
| PostgreSQL least privilege | Separate cluster, restricted runner, marker owner separate from runner | Review role grants, PUBLIC defaults, marker `enabled=false`, preflight requirements | PENDING |
| Change execution | Explicit scope and maintenance window | Administrator, change authorization, expected downtime/rollback and exact target inventory | PENDING |
| Integration tests | Independent approval after installation | Explicit marker enablement and guarded test-run authorization | NOT AUTHORIZED |

## Exact resource boundary

**Read-only / protected:** Windows service `postgresql-x64-15`, TCP port `5432`, its PostgreSQL data directory, all existing databases, roles, backup jobs and network configuration.

**Proposed new resources only:** Windows service `postgresql-sbn-forge-test`, TCP port `5433`, data directory `C:\SBN\PostgreSQL15-Forge-Test`, database `sbn_forge_execution_test`, SQL runner `sbn_forge_test_runner` and independent authorization marker.

A separate cluster on the same Windows host does not provide host-level isolation.

## Authorization and implementation boundaries

1. Review the pending decisions and evidence with the Windows/PostgreSQL administrator. Do not include passwords, tokens, personal details or confidential connection strings in Git.
2. Record administrative sign-off in the organization's approved change-control system. **Do not set an approval flag based solely on the existence of this document.**
3. Once approved, separately review the exact state-changing commands/scripts and rollback actions before any installation. The existing 8U coordinator has no Install mode.
4. A future installation must fail closed on service, port, path or privilege collisions, and compare the 5432 baseline before/after.
5. Integration tests remain blocked until a **separate** approval; marker starts disabled, with owner independent from runner.

## Decision to proceed

- [ ] Service account and NTFS plan independently approved
- [ ] Backup/recovery/capacity plan independently approved
- [ ] Network, SCRAM and PostgreSQL role plan independently approved
- [ ] Installation change window, operator and rollback scope approved
- [ ] Exact provisioning implementation reviewed
- [ ] Existing 5432 service and data explicitly excluded

**Until every applicable item has external evidence and an explicit installation authorization, status remains `PENDING`.** This checklist is documentation only and cannot authorize operations.

## Next phase

After administrative decisions are supplied and reviewed, develop or approve a scoped installer. Do not run `initdb`, register/start services, change NTFS, create SQL objects or enable the test marker as part of 8V.
