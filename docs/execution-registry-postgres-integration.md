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
operational databases. The account must not be a superuser, have CREATEDB,
CREATEROLE, REPLICATION or BYPASSRLS, or be a member of the database or
marker owning roles. It must not have CREATE on the public schema or any
INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges on the
independently administered authorization marker.

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

The runner first checks exact database name, the pre-existing authorization
marker, role privileges and ownership separation, then launches the three real
integration tests. The integration suite repeats the explicit approval and full
read-only preflight before any schema DDL, including when Jest is invoked
directly. The marker and environment approval must be provisioned out of band.

The suite inserts only uniquely prefixed temporary runner records and cleans
them afterward; its `forge_security` schema and tables remain for audit and
future test runs. This is not a disposable database lifecycle manager. A failed
process may leave test records that require administrative cleanup.

**Limitations:** a marker does not prove the server is isolated; independently
verified infrastructure and privileges are required. The authorization marker
must not be writable by the test runner. This flow does not certify artifacts,
publish packages, enable installation or connect to production.

## Local configuration inventory (no database connection)

Before configuring or approving any integration execution, run:

```text
node studio/execution-registry-configuration-inventory.js
```

The output reports only boolean configuration presence and a predefined status
code. It never prints the PostgreSQL URL, hostname, username, or password. It
makes **no network connection**, creates no database or authorization marker,
and never changes database privileges. `CONFIGURATION_MISSING` means one or
both required test connection settings are absent. Even
`CONFIGURATION_PRESENT_PREFLIGHT_REQUIRED` does **not** prove that the
server, database, or permissions are isolated or authorized.

An independent administrator must identify the test server and confirm its
isolation before any provisioning. Never infer that a local or remote server
is safe from a database name containing `test`.

Once a dedicated environment has been independently provisioned and configured,
`node studio/execution-registry-environment-preflight.js` performs read-only
authorization and privilege checks. It still does not approve execution.
