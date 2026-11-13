# Portal tenant PostgreSQL — offline isolation scenario plan

The plan in `studio/portal-tenant-pg-scenario-plan.js` describes two fictional organizations and two fictional records, with 14 assertions across list, read, create, update, delete and missing trusted context. It is **not a runnable PostgreSQL integration harness**.

The manifest is immutable and contains no connection string, SQL commands, credentials, database driver, network access or installation functionality. It does not grant fixture execution or publication. Its tests only verify scenario coverage and the fail-closed preparation boundary.

Before implementing a live executor: obtain explicit approval for a disposable, dedicated test database; independently verify actual server identity and limited roles; establish an approved isolated fixture schema with a separately controlled provisioning role; ensure unique test data, rollback/cleanup even after failures, no access to operational Portal tables, and capture read-only evidence. The existing static preflight and read-only identity inspection are **necessary but not sufficient** to authorize fixture writes.

No remote PostgreSQL connection, production schema modification, Portal installation or publication is performed by this macro-block.
