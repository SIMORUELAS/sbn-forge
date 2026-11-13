# PostgreSQL tenant server inspection — read-only gate

This step adds `studio/portal-tenant-pg-server-inspection.js`, with tests. It composes the static target preflight with one parameter-free, read-only PostgreSQL identity/privilege SELECT via an injected query adapter.

It rejects unexpected connected database identity, privileged roles, membership in the database owner's role, and schema creation privileges (database or public schema). It returns no connection credentials or raw driver errors and never grants fixture execution, installation or publication approval.

**Scope:** The unit tests use a mocked query adapter. No live PostgreSQL connection has been made. The inspection does not prove that a server is disposable, that the user cannot write to existing tables, or that a real tenant SQL query is safe. A future integration harness must check the actual connected host and ownership boundaries, provision an explicitly approved isolated fixture schema using a separately authorized role, run cross-tenant assertions, and guarantee cleanup. This gate is not sufficient by itself to authorize that harness.

The existing SBN Portal backend, remote PostgreSQL server, and production data are untouched.
