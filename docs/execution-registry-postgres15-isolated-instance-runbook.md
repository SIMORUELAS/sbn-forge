# Macro-block 8P — PostgreSQL 15 Forge Test, separate Windows instance (PLAN ONLY)

**Status: documentation only. No provisioning or local execution authorized.**
Target: existing PostgreSQL 15 binaries, new cluster on TCP 5433, dedicated Windows service and data directory. Do not run any commands in this document until the operator explicitly approves execution and independently reviews the host and service identity.

## Existing environment, read-only evidence (2026-11-05)

- Existing service `postgresql-x64-15` runs from `C:\Program Files\PostgreSQL\15\data` and listens on 5432 (IPv4 and IPv6). Do not touch it.
- PostgreSQL 15.2 binaries `initdb.exe`, `pg_ctl.exe`, `psql.exe` are present.
- No 5433 listener or `C:\SBN\PostgreSQL15-Forge-Test` directory was found at inspection time. Recheck before any action.
- Existing cluster contains 15 databases; all have PUBLIC CONNECT and TEMPORARY. This is why a separate cluster is preferred. Do not change grants on the existing cluster.

## Target and trust boundaries

| Item | Planned value |
| --- | --- |
| PostgreSQL installation binaries | `C:\Program Files\PostgreSQL\15\bin` (shared executable binaries only) |
| Existing cluster | `5432`, `C:\Program Files\PostgreSQL\15\data` (untouched) |
| New cluster data | `C:\SBN\PostgreSQL15-Forge-Test` (new, dedicated, non-symlink directory) |
| New Windows service | `postgresql-sbn-forge-test` (new, unique) |
| New port | `5433` (loopback only) |
| Test database | `sbn_forge_execution_test` |
| Restricted database login | `sbn_forge_test_runner` |
| Database owner and marker owner | independently administered, never the runner |
| Test schema | `forge_security` |
| Authorization marker | `public.sbn_forge_execution_registry_test_authorization` |

A separate PostgreSQL *cluster* has independent catalog roles, databases, and authentication policy. It is still on the same Windows host and shares its OS, hardware and binaries; it is not a separate machine or security boundary against host administrators.

## Phase 0 — mandatory read-only preflight and stop conditions

Administrator must inspect Windows elevation, service-account availability and rights, executable signatures/path, current service names and data paths, listening ports, ACLs and junctions/symlinks on the proposed parent/data directory, available disk, backup/recovery and endpoint security policy. Verify the service identity is a dedicated non-administrative Windows account with **Log on as a service** and NTFS permissions only where needed. Do not use LocalSystem or the interactive developer account by default. Do not place PostgreSQL data under the current cluster or under a directory writable by untrusted users.

**Stop** if port 5433 is occupied, service name or directory exists, parent is a reparse point, privileges cannot be constrained, a dedicated service identity is unavailable, or host policy disallows another service. Never overwrite/reuse an existing cluster, service, role, or data directory.

## Phase 1 — administrator-reviewed provisioning design (NOT commands to execute now)

1. Create the dedicated Windows service identity through approved Windows administration, with strong credential handling and least privilege. Do not commit passwords, embed them in scripts, or print them in logs. Confirm filesystem ownership and service logon rights.
2. Create a **new empty** directory at the planned path, assign restrictive NTFS ACLs to the dedicated identity and administrators, and confirm it is not a junction/symlink. Keep logs outside source control.
3. Run `initdb` **as the dedicated Windows identity**, pointing explicitly to the new directory. Choose SCRAM-SHA-256 host authentication and independently supplied bootstrap credentials (never `trust`, never a plaintext password argument or a checked-in pwfile). Avoid running initdb as an elevated Windows administrator. Inspect generated configuration before service registration.
4. Set `port = 5433` and `listen_addresses = 'localhost'`. In `pg_hba.conf`, allow only required local loopback host connections using `scram-sha-256`; reject all other addresses and review IPv4/IPv6 behavior. Do not edit configuration in the existing 5432 data directory. Confirm Windows Firewall exposure and host network restrictions.
5. Register a **new** service with `pg_ctl register`, specifying the exact new data directory, service name and approved Windows service identity. Start only the new service. Check `pg_controldata`, service executable command line, and connection identity on port 5433 before any SQL DDL. If service registration cannot safely use the dedicated identity, stop rather than silently falling back to a privileged account.
6. In the new cluster only, create the new test database under an administrative owner separate from the runner. Create the runner as LOGIN with NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS and no memberships in owning roles. Supply secrets through an approved interactive/secret-management mechanism; no credentials in repository or command history.
7. Revoke default PUBLIC CONNECT/TEMP privileges on **new cluster databases** as appropriate, then explicitly grant only required access to the new test database. Check effective grants for `postgres`, `template1`, and the test database. This step must NEVER target the old 5432 cluster.
8. In the test database only, create the authorization marker as an independently owned table with `enabled=false` initially; grant SELECT to runner, no write/alter/ownership. Deny CREATE on `public` and grant USAGE. Grant CREATE on the test database to allow the existing test suite to create `forge_security`. Validate database-owner and marker-owner membership separation.
9. After independent approval of the cluster identity, network restrictions, ownership and role privileges, an administrator may enable the marker in the test database. This is a **separate authorization hold point**; merely provisioning the environment does not authorize integration execution.
10. Configure `SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE=sbn_forge_execution_test` and a secure `SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL` pointing to loopback **port 5433**. The current `requireDedicatedTestDatabase` guard checks the database name, not port; the operator must verify the port/cluster separately. Run the read-only preflight. Only with separate explicit approval set `SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED=1` and run `node studio/authorized-execution-registry-integration.js`.

## Evidence and validation (after authorization, not part of 8P)

Record service name and path, port, `current_database()`, `current_user`, `inet_server_port()`, effective privileges, marker ownership and state, test outcomes, and confirmation that the 5432 cluster is unchanged. Redact secrets and connection strings. The existing suite contains three real PostgreSQL tests for concurrent claim, persistence and revoked runner; until run they remain skipped/unverified.

## Recovery / cleanup hold point

Define backups and recovery before provisioning. Never delete `C:\Program Files\PostgreSQL\15\data` or stop `postgresql-x64-15`. Stopping/removing the **new** service, deleting the **new** cluster data, or revoking credentials are destructive operations and require separate approval after verifying exact service identity and path. No automated cleanup of operational data.

## Security limits

This runbook does not certify artifacts, enable installation, send email, modify operational PostgreSQL grants, or change production configuration. It intentionally contains no auto-executing installation script. The execution phase must be reviewed and explicitly authorized independently.

## Macro-block 8Q — read-only Windows prerequisite check

After pulling the repository, an operator may run this non-mutating diagnostic
from the Studio repository root in Windows PowerShell:

```powershell
powershell.exe -NoProfile -File .\scripts\Test-SbnForgePostgres15Prerequisites.ps1
```

The script checks binaries, the original service, collisions for the new service,
port and data directory, and reparse-point ancestors. It deliberately reports
`PREFLIGHT_ONLY_NOT_AUTHORIZED` and blocks service-account/ACL and host/backup
reviews pending independent verification. It **does not install anything** and
must never be treated as installation approval. No database credentials are
required. The proposed service identity, filesystem ACLs, network restrictions,
initialization commands and SQL provisioning remain subject to a separate
operator-approved installation phase.

## Macro-block 8R — Windows security readiness (read-only)

Run after pulling the Studio branch:

```powershell
& ".\scripts\Test-SbnForgePostgres15SecurityReadiness.ps1"
```

The script checks the proposed data path against the existing cluster, service
name collision, port listeners, a minimum free-space threshold, and existing
reparse-point ancestors. It deliberately leaves **three mandatory human gates**
blocked: service identity/NTFS, backup/recovery, and local-only network/SCRAM.
The free-space threshold is a preliminary signal, not capacity planning.
It does not create anything and does not inspect or expose passwords.

**Execution hold point:** an administrator must separately approve an exact
service identity, NTFS ACLs, backup plan, SCRAM credential delivery and
configuration before a future provisioning script may be prepared for
execution. Neither this diagnostic nor a PASS result constitutes approval.
