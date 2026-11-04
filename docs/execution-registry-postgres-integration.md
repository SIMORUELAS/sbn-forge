# SBN Forge — PostgreSQL execution registry integration

This is an opt-in **test-only** workflow. The application never creates a
database, creates the authorization marker, or authorizes itself.

## External provisioning prerequisite

A database administrator must independently confirm a disposable, isolated
PostgreSQL database, a dedicated login, network isolation and least privilege.
Its name must contain a test marker (for example `forge_execution_test`).
Do not reuse an operational Forge or Portal database.

**Only in that independently verified test database**, an administrator can
provision the authorization table and record:

```sql
CREATE TABLE public.sbn_forge_execution_registry_test_authorization (
  database_name text PRIMARY KEY,
  purpose text NOT NULL,
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.sbn_forge_execution_registry_test_authorization
  (database_name, purpose, enabled)
VALUES (current_database(), 'execution-registry-integration', true);
```

The dedicated test account needs SELECT on the authorization table and
CREATE on the test database for the `forge_security` schema, plus privileges
to create and manipulate the two test tables. Do not grant it privileges on
operational databases. Do not grant it UPDATE/INSERT/DELETE on the
authorization table.

## Running after independent approval

Set these environment variables **in the test runner environment**, not in
tracked source or shell history containing secrets:

- `SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED=1`
- `SBN_FORGE_EXECUTION_REGISTRY_EXPECTED_TEST_DATABASE=forge_execution_test`
- `SBN_FORGE_EXECUTION_REGISTRY_TEST_DATABASE_URL` — PostgreSQL URL for the
  dedicated test database, supplied by a secret manager.

Then execute:

```text
node studio/authorized-execution-registry-integration.js
```

The runner first checks exact database name and the pre-existing authorization
marker, then launches the three real integration tests. The integration suite
checks authorization again before any schema DDL.

The suite inserts only uniquely prefixed temporary runner records and cleans
them afterward; its `forge_security` schema and tables remain for audit and
future test runs. This is not a disposable database lifecycle manager. A failed
process may leave test records that require administrative cleanup.

**Limitations:** a marker does not prove the server is isolated; independently
verified infrastructure and privileges are required. The authorization marker
must not be writable by the test runner. This flow does not certify artifacts,
publish packages, enable installation or connect to production.
