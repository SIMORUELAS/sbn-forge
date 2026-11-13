# Portal bridge on generated CRUD routes

The generated `routes.hbs` template accepts an explicit `options.portalSecurityBridge` with `preHandler(operation)`. It is an offline integration contract, not automatic Portal installation. With this opt-in, all five route handlers receive the bridge's guards; the legacy `authorizeOperation` callback is used only without the bridge.

Registration fails when the bridge lacks its expected shape, a tenant column is missing, tenant isolation or CRUD permissions are not required, or JWT generation is disabled. The generated controller forwards the authorized `portalSecurityContext` and the repository independently scopes SQL by the configured tenant column.

The bridge itself requires trusted host-supplied JWT verification and database membership/permission queries. A generated route with `security.requireJwt` also invokes its module JWT hook; real host compatibility is not yet established. Action mapping in Portal JSON and tenant-column suitability require review. Existing legacy routes remain available and are **not** certified for Portal deployment. No module installation, publication or live database access is performed.

Validate in one local pass with `npm run lint` and `npm test`.
