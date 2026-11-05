# Macro-block 8W — Installation package and approval hold

**Prepared, not executable.** This package defines the full ordered installation workflow but does not contain state-changing commands or a runnable Install mode. It does not approve infrastructure changes.

## Single review entry point

```powershell
& ".\scripts\Invoke-SbnForgePostgres15InstallationReview.ps1" -Mode Manifest
& ".\scripts\Invoke-SbnForgePostgres15InstallationReview.ps1" -Mode Review
```

Both modes are read-only and output JSON. The earlier `Invoke-SbnForgePostgres15Provisioning.ps1` continues to support `Plan` and `Preflight` only. Do not interpret a passing read-only check as authorization.

## Planned installation stages

1. Select a dedicated non-admin Windows service identity and approve its service-logon rights and credential lifecycle.
2. Approve exact NTFS ownership, inheritance, and restricted permissions for the new data and log paths. Never access the original PostgreSQL data directory.
3. Under the approved identity, initialize a **new** PostgreSQL 15 cluster with SCRAM. Do not reuse existing directories or supply credentials through repository files or command-line literals.
4. Configure port **5433**, loopback-only listeners, and narrowly scoped `pg_hba.conf` with `scram-sha-256`. Verify rule ordering and IPv4/IPv6 behavior.
5. Register/start **only** `postgresql-sbn-forge-test` using the dedicated identity. Confirm the original `postgresql-x64-15` service and port 5432 remain unchanged.
6. Connect explicitly to port 5433, verify endpoint identity, and provision only `sbn_forge_execution_test`, a restricted `sbn_forge_test_runner`, and an independently owned authorization marker with `enabled=false`. Follow the existing guard and preflight contract; do not grant broad privileges.
7. Verify isolation, privileges, loopback listeners and unchanged original cluster. The three PostgreSQL integration tests require separate approval and are not run during installation.

## Mandatory stop conditions

Stop on any missing administrative decision, collision of service/port/path, insecure ACL, unresolved backup policy, authentication ambiguity, incorrect database endpoint, or change to the original cluster. No automatic rollback or deletion is allowed. A rollback is a separately reviewed, narrowly scoped operation.

## Approval inputs still missing

- Exact Windows account and approved service-logon/NTFS policy.
- Storage sizing, backup/restore objectives, retention and operator.
- Secure bootstrap/runner credential handling and SCRAM/network policy.
- SQL role/marker ownership and privilege review.
- Change window, named authorized operator and precise rollback approval.
- **Explicit approval to execute installation**, separate from approval to prepare this package.

The administrative decision record is `execution-registry-postgres15-8v-administrative-approval.md`. The detailed stage blueprint is `execution-registry-postgres15-8t-controlled-provisioning.md`. Keep approval evidence outside Git and do not commit secrets.

## 8W acceptance

- Full installation sequence represented as a reviewable, deterministic manifest.
- Review command returns explicit `INSTALLATION_NOT_AUTHORIZED`.
- No account, directory, service, database or network configuration is changed.
- Original port 5432 and its existing databases remain out of scope.
