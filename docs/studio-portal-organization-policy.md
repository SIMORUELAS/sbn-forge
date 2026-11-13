# SBN Forge Studio — Offline Portal organization policy

Inspected the existing Portal repository (`SIMORUELAS/sbnportal-apis`, branch `feature/ai-tasks-transactional-security`) read-only:

- `src/modules/organization_users/organization_users.repository.js`: `public.organization_users` has `organization_id`, `user_id`, `role`, `status`.
- `src/modules/role_option_permissions/role_option_permissions.repository.js`: `public.role_option_permissions` has `organization_id`, `role_code`, `option_id`, `allow`, `actions`.
- The existing controllers and routes do **not** establish a verified policy for choosing the active organization on behalf of the user.

`studio/portal-organization-policy.js` adds a *proposed*, isolated policy that accepts an injected read-only query function. The organization header is only a requested selection; the policy requires matching active membership. It then checks the matching role-option record, `allow === true` and an explicit `actions[operation] === true`. Missing or malformed values are denied. SQL parameters are bound, not interpolated. It can be composed with `studio/portal-security-adapter.js` for offline testing.

**Critical assumptions pending Portal confirmation:** the exact meaning of `status = 'active'`, the role naming convention, the `actions` JSON keys, the option ID assigned to each generated module, and whether delegations or additional restrictions apply. This is a conservative proposed policy, not an assertion that Portal already implements these semantics. No production SQL was executed. It is not connected to generated routes or the Portal server.

The policy does not itself apply tenant predicates to module repositories; those must be separately proven. No installation or publication is authorized.

Validate in one block:

```powershell
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```
