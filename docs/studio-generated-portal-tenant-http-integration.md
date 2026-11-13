# Offline Portal tenant HTTP integration

This test generates a real Fastify CRUD artifact, registers the opt-in Portal bridge, signs a local test JWT and injects HTTP requests for list, read, create, update and delete. A recording SQL adapter verifies that each permitted operation passes the authorized organization UUID into the generated repository; a forged tenant in the JWT or request body must not appear in SQL parameters.

For each operation, the test rejects missing JWT and a selected organization without active membership before any data SQL executes. A membership and permission policy is simulated in memory, with no PostgreSQL connection, server access, publication or installation.

**Limits:** SQL is recorded, not executed against a real database. The test checks parameter scope and permission denial, not PostgreSQL row-level enforcement, host action mapping, real Portal JWT compatibility or deployment readiness. The bridge and generated routes remain explicitly non-certified.
