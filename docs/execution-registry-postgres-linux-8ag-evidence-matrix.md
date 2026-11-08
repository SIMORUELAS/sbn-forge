# Macro-bloque 8AG — Evidence and administrative decision matrix

The offline module `studio/linux-postgres-evidence-matrix.js` extends the 8AF readiness assessment with a fixed allowlist of evidence requirements derived from the 8AC and 8AD checklists, plus explicit dual-channel inspection, restricted inventory, and rollback review requirements.

Each requirement has a designated reviewer role and evidence type. Inputs are **references** to independently stored and redacted evidence, never raw SSH logs, pgAdmin exports, credentials, or URLs.

## Interpretation

- `EVIDENCE_MATRIX_BLOCKED`: invalid or duplicate evidence records, unsupported verification claims, rejected evidence, or blocked 8AF readiness.
- `EVIDENCE_MATRIX_INCOMPLETE`: at least one independent review claim or 8AF condition is missing.
- `EVIDENCE_CLAIMS_READY_FOR_EXTERNAL_AUDIT`: all supplied records claim independent review and 8AF design conditions are favorable. **Not proof of audit, approval, or authorization.**

The module cannot authenticate reviewers, check external evidence references, verify timestamps against a trusted clock, or independently prove administrative approval. These remain external responsibilities. Even the most favorable result keeps all database, role, connection, SQL and integration-test flags false.

## Actual infrastructure state

The prior SIMOTECNOLOGIAS observations are insufficient for independent verification: restricted inspection identity, HBA/perimeter, certificate identity, recovery verification and administrative approvals remain unresolved. Do not mark those requirements as VERIFIED based on the existing observations.

## One local validation

```powershell
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```

No SSH, pgAdmin, Plesk, or server modifications are part of 8AG.
