# Macro-block 8AA — Linux PostgreSQL inspection readiness

**Offline-only operator preflight. No connection, role creation, DDL, DML, or test execution.**

Run `node studio/linux-postgres-inspection-readiness.js` to see which prerequisites are missing. This command reads environment variables but does not connect to the server or display the URL, hostname, login or password.

Required inspection configuration:
- `SBN_FORGE_LINUX_INSPECTION_DATABASE_URL`: approved PostgreSQL connection URL with explicit host/port and database `postgres`.
- `SBN_FORGE_LINUX_INSPECTION_EXPECTED_DATABASE=postgres`.
- `SBN_FORGE_LINUX_RESTRICTED_LOGIN_CONFIRMED=true`: independent administrator confirmation that inspection uses a restricted login, not a superuser.
- `SBN_FORGE_LINUX_NETWORK_APPROVED=true`: approved private/VPN network path.
- `SBN_FORGE_LINUX_TLS_VERIFIED=true`: TLS with certificate verification independently confirmed, not merely encryption without server identity verification.
- `SBN_FORGE_LINUX_NONPRODUCTION_CONFIRMED=true`: independent confirmation of the target server's purpose.

The booleans are **operator attestations**, not cryptographic or live verification. `INSPECTION_CONFIGURATION_READY` is only a configuration gate, **not permission to connect**. Obtain separate approval before executing `node studio/linux-postgres-readonly-inventory.js`. That inventory's `sslActive` flag alone cannot prove certificate validation.

Never place passwords in shell history, chat, source control or screenshots. Use approved secret management and do not disable certificate verification. Do not use the existing `sbn_portal_test` as a Forge test database. The proposed `sbn_forge_execution_test` requires independent provisioning approval and restricted roles.

After an authorized read-only inventory, evaluate the result offline with `assessLinuxIsolation` from `studio/linux-postgres-isolation-assessment.js`. No part of 8AA provisions the database or activates the authorization marker.

Local validation:
```powershell
git pull --ff-only
npm run lint
npm test
node .\\studio\\linux-postgres-inspection-readiness.js
```
