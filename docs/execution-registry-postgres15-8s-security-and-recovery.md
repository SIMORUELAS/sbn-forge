# Macro-block 8S — Security and recovery specification (planning only)

**Status:** PROPOSED / NOT AUTHORIZED. This document does not approve provisioning, database writes, service registration or changes to the existing PostgreSQL 5432 cluster.

## Scope and separation

- Reuse installed PostgreSQL **15** binaries, but create a **separate** cluster with a distinct Windows service, data directory and port.
- Proposed new service: `postgresql-sbn-forge-test`; port: `5433`; bind only `127.0.0.1` and `::1` after checking IPv6 availability.
- Proposed data directory: `C:\SBN\PostgreSQL15-Forge-Test`; database: `sbn_forge_execution_test`; restricted SQL login: `sbn_forge_test_runner`.
- Do not touch `postgresql-x64-15`, its data directory, port 5432, existing roles/databases, registry entries, Windows ACLs or firewall rules.
- A separate cluster on the same Windows host reduces PostgreSQL-level interference but does **not** isolate host resources or Windows administrator access.

## Gate A — Dedicated Windows service identity and NTFS

1. Administrator selects a **new dedicated non-admin Windows account**, with no interactive login, no unnecessary group memberships, and only the `Log on as a service` right needed to run this service. Confirm account policy and password/rotation handling with the host administrator; never store credentials in Git, scripts, terminal history or output.
2. Inspect inherited ACLs, existing PostgreSQL 15 binary ACLs, parent directory ACLs, owner, junctions/reparse points and filesystem type. The selected account must be able to read/execute PostgreSQL binaries and own/write only the **new** data directory and necessary new log location. Do not grant access to the existing cluster's data.
3. Before creating any directory or service, independently approve the exact account, paths, ownership and intended ACL entries. A privileged operator must review commands before execution. The scripts in macro-blocks 8Q/8R are read-only and do not satisfy this gate automatically.
4. Fail closed on path collision, reparse points, inherited broad write permissions, service-name collision, insufficient access or account policy uncertainty.

## Gate B — Network and PostgreSQL authentication

1. Bind `listen_addresses` to loopback only and use port `5433`; explicitly check IPv4 and IPv6 behavior. No remote TCP listeners.
2. Initialize with SCRAM-capable password handling and require `scram-sha-256` for host authentication. Never use `trust`, `password` (cleartext), or broadly permissive `pg_hba.conf` entries.
3. Limit `pg_hba.conf` to required loopback connections and explicitly scoped roles/databases; ensure ordering does not allow a broad rule to override a narrow rule.
4. Keep PostgreSQL superuser/bootstrap credentials separate from the restricted runner; deliver secrets using an approved secure channel, not command-line literals, environment dumps or tracked files.
5. For the **new cluster only**, review default PUBLIC database privileges and explicitly restrict access before provisioning the runner. Runner must have no SUPERUSER, CREATEDB, CREATEROLE, REPLICATION or BYPASSRLS, no unneeded schema CREATE, and no write permission on the independent authorization marker.
6. Create the marker table `public.sbn_forge_execution_registry_test_authorization` with `purpose='execution-registry-integration'` and `enabled=false` initially. Its owner must be separate from the runner. Enabling it requires an **additional explicit approval**, separate from cluster installation.
7. Run the existing read-only environment preflight before any integration test. Do not relax the test guard to make tests pass.

## Gate C — Backup, recovery and removal

1. Confirm actual free space, estimated cluster growth, backup location and retention with the host owner; 5 GiB is a diagnostic threshold, **not** a sizing decision.
2. Document recovery objectives, test data sensitivity and whether test-cluster backups are required. If backups are required, select a destination distinct from the data directory, encrypt where applicable, restrict access, and validate restore procedures in an approved isolated environment.
3. Keep the original cluster's backup schedule and recovery procedures unchanged.
4. Rollback/removal must target **only** the new service, new cluster directory and new credentials, and must verify the exact identity of each resource. Never delete by wildcard or based only on a guessed path. Removal is a separately approved operation.
5. Before and after a future approved installation, compare the existing service status and 5432 listener; stop if they change unexpectedly.

## Explicit authorization boundaries

**8S approval scope:** review and refine the plan and run read-only checks only. No account creation, ACL change, `initdb`, service registration/start, SQL writes, credential creation, firewall changes or backup configuration.

**Future installation approval:** separately identify approved Windows service account, paths, network/auth configuration, administrative operator, backup policy and maintenance window; execute one reviewed, scoped provisioning block with stop-on-error and a verification report.

**Future test execution approval:** independently enable the marker and set `SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED=1` only after the new cluster has passed isolation and privilege checks. The three gated PostgreSQL integration tests remain skipped until then.

## Acceptance criteria for this planning block

- Three administrative gates are documented with fail-closed behavior.
- The existing PostgreSQL 5432 cluster is explicitly out of scope.
- No scripts that mutate host or database resources are run or automatically triggered.
- Installation and integration-test authorization remain distinct.
