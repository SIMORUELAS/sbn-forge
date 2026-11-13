# Portal tenant PostgreSQL integration — preparation boundary

The generated Fastify CRUD/JWT/Portal bridge path passed its offline HTTP integration suite at commit ea38b5e (119 suites / 417 tests reported by the local operator).

This macro-block adds `studio/portal-tenant-pg-test-preflight.js`, a **static, fail-closed test-target configuration check**, with negative tests. It does not connect to PostgreSQL, execute SQL, create tables, inspect server permissions, certify tenant isolation or grant installation/publication approval.

Before a real database integration can be implemented or run, the operator must explicitly approve a **dedicated disposable test database** and a restricted test role. The next harness must verify the actual connected database identity and role privileges server-side, reject production-like targets, use uniquely scoped fixtures and guaranteed cleanup, and demonstrate that cross-organization list/read/update/delete cannot observe or mutate other tenants' records. Real Portal host JWT/permissions compatibility remains a separate review.

No remote server, Portal backend, PostgreSQL schema, or production state is changed by this commit.
