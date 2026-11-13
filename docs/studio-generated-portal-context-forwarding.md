# Generated CRUD controller — Portal security context forwarding

The generated controller now prefers `request.portalSecurityContext.userId` and `request.portalSecurityContext.organizationId` when present. This matches the offline bridge, which sets the context only after verifying JWT, membership and operation permission. It prevents an unrelated `request.user.organization_id` value from overriding an already authorized Portal organization. The legacy JWT fallback remains for existing generated modules.

Six offline controller execution tests cover all five CRUD operations and the legacy fallback. Existing tenant SQL tests separately verify direct-column scoping for generated repositories.

**Not a deployable security integration:** Generated routes still use their own permission guard, and the bridge is not wired into those routes. The legacy fallback must not be considered equivalent to the Portal bridge for a production integration. Before enabling installation, the generated route registration must require a trusted bridge and enforce an explicit tenant-column mapping; end-to-end negative cross-tenant tests and verified Portal action names are required. No Portal backend or live database was changed.
