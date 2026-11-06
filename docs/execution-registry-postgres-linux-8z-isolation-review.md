# Macro-block 8Z — Offline Linux PostgreSQL isolation review

**Status: policy and unit tests only. No server connection, provisioning or execution authorization.**

The read-only inventory from 8X is an observation, not an authorization. Use `assessLinuxIsolation(inventory, context)` in `studio/linux-postgres-isolation-assessment.js` to evaluate a previously obtained inventory in memory. No secrets or connection strings are needed.

The review requires TLS, a nonprivileged inspection role, no database ownership membership and no CREATE privileges for that inspection role. Administrative evidence must independently confirm a nonproduction environment, private network access, protection of existing databases, approval for a dedicated database and a separately restricted test runner. A missing confirmation remains unknown rather than implicitly approved.

A favorable result is **PROVISIONING_REVIEW_ONLY**, never permission to run integration tests. The dedicated database `sbn_forge_execution_test` and marker must be provisioned and authorized separately. The execution registry's existing guard and preflight remain mandatory. The databases `postgres` and `sbn_portal_test` are never test targets.

The inspection role and future integration runner have different permission requirements: the former must not CREATE, while the latter will require narrowly scoped CREATE on its dedicated database. This assessment does not create either role.

Run unit tests without any PostgreSQL connection:

```powershell
npm test -- --runTestsByPath tests/studio-linux-postgres-isolation-assessment.test.js
```
