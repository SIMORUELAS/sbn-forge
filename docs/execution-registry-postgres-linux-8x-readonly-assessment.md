# Macro-block 8X — Linux PostgreSQL read-only suitability assessment

**State: inspection only; no new database or integration test is authorized.**

The operator reported that the existing Linux server `SIMOTECNOLOGIAS` is currently used for testing. pgAdmin displays an existing PostgreSQL connection and databases `postgres` and `sbn_portal_test`. This does **not** establish its PostgreSQL version, transport security, role isolation or permission to create another database.

## Change of strategy

Pause (do not delete) the Windows 5433 installation plans from 8P–8W. First evaluate whether a dedicated `sbn_forge_execution_test` database and a restricted role can be safely provisioned on the existing Linux PostgreSQL instance. Existing `sbn_portal_test` and `postgres` must not be modified. A database within the same cluster is **logical** isolation, not instance or host isolation.

## Inventory command (optional, read-only)

From a network location permitted by the server administrator, use a **dedicated read-only inspection login** and a PostgreSQL URL pointing to the existing `postgres` maintenance database. Do not use the `postgres` superuser for automated inspection. Never paste credentials into Git, chat, command history, or screenshots.

Set `SBN_FORGE_LINUX_INSPECTION_DATABASE_URL` using an approved secret-handling method. The URL must include an explicit host and port; it may omit the password when authentication is securely provided by the approved PostgreSQL client configuration. Set `SBN_FORGE_LINUX_INSPECTION_EXPECTED_DATABASE=postgres`. Then run:

```powershell
node .\studio\linux-postgres-readonly-inventory.js
```

The tool runs **one SELECT** on the confirmed database. It returns server version, connection TLS status, current role privilege flags and schema/database permissions. It does not output credentials or server address, create resources, enable authorization markers or execute integration tests. If TLS is not active, treat remote inspection as **not approved** until secure transport is arranged. Never disable TLS verification merely to pass the diagnostic.

The inspection login and its secure credential configuration are prerequisites. **Do not create them as part of 8X.** If no restricted read-only login exists, stop and request administrator approval for one rather than using superuser credentials.

## Decision gates

1. Verify the server is genuinely a non-production test environment and establish backup/restore and resource ownership for `sbn_portal_test`.
2. Confirm PostgreSQL version, TLS and network allow-list, preferably private network/VPN rather than exposing port 5432 publicly.
3. Review whether a **separate restricted runner** can be created with no cluster admin attributes and no access to existing application schemas.
4. Verify the existing `execution-registry-environment-preflight.js` contract can be met on a future **dedicated** database: runner CREATE on test DB, USAGE/no CREATE on public schema, marker independently owned with SELECT-only access, no database-owner membership, and marker enabled only after separate approval.
5. Never point the integration-test URL to `postgres` or `sbn_portal_test`. The three real PostgreSQL tests remain skipped until the dedicated test database exists and passes the preflight.
6. Only after independent approval, prepare narrowly scoped SQL provisioning. 8X performs no provisioning.

## Acceptance

- The inventory script and unit tests exist in GitHub.
- No production or existing test database changes are made.
- Windows 5433 installation remains on hold.
- The Linux host is a candidate, **not yet approved** as the integration-test target.
