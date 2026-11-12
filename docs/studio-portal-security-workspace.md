# Studio — Visual Portal security checklist

The existing `studio/portal-module-security-contract.js` is now available through the read-only endpoint `GET /api/studio/portal-security/:name` for **saved local definitions only**. The server constructs the assessment with no host declarations or evidence claims. Browser input cannot authorize a requirement.

The **Generación → Revisar** view displays the eight pending requirements for the selected run: JWT verification, trusted identity, per-operation authorization, organization context, tenant query isolation, host dependencies, route conflicts, and migration review.

This is a **design-time checklist** based on the saved module name, **not an artifact-specific runtime attestation**. Existing historical artifact diagnostics and installation simulation remain separate and authoritative for their respective scopes. Every outcome keeps installation and publication disabled. No SBN Portal, PostgreSQL or server administration actions are performed.

## Validate once locally

```powershell
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```

Restart the local Studio server, open `http://127.0.0.1:4173/#generacion`, and select **Revisar** on an existing run. Confirm the new **Seguridad SBN Portal · solo lectura** panel shows the pending checks. Do not click **Generar aislado** for this test.
