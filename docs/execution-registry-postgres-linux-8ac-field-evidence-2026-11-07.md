# SBN Forge Studio — 8AC: sanitized field evidence (2026-11-07)

## Scope and provenance
Operator-supplied SSH terminal output and pgAdmin screenshots. This is a **manual observation record**, not automated verification, authorization, or proof of network perimeter protection. No credentials, hostnames, public IP addresses, firewall rules, certificates, or raw configuration dumps are retained here.

## Observed
| Area | Observation | Interpretation |
| --- | --- | --- |
| OS | Ubuntu 24.04.4 LTS | Reported by SSH login |
| PostgreSQL | Cluster 16/main, online, port 5432 | Observed via `pg_lsclusters` |
| TCP listener | `listen_addresses = '*'` | Listens on configured interfaces; public reachability **not established** |
| UFW | inactive | External/provider firewall **not assessed** |
| Server TLS setting | `ssl = on` | Does **not** require TLS for every client |
| pgAdmin connection | `pg_stat_ssl.ssl = true`, TLSv1.3 | Encryption observed for **this session only**; certificate hostname/CA validation **not established** |
| Authentication | SCRAM-SHA-256 entries observed | Effective access scope **not independently verified**; no rules copied |
| max_connections | 100 | Configuration observation, not capacity approval |
| shared_buffers | 16384 blocks | Approximately 128 MiB if block size is 8 KiB |
| Database inventory | `postgres`, `template1`, `sbn_portal_test` | Three connectable databases observed; no new database created |
| pgAdmin inspection context | `sbn_portal_test`, administrative `postgres` account | **Not** the restricted maintenance-db inspection required by 8AC |
| Backups and recovery | Not verified | Must be independently confirmed |

## Gate decision: INCOMPLETE — no authorization
- Existing `studio/linux-postgres-dual-channel-review.js` requires an independently approved **non-privileged** inspection role connected to maintenance database `postgres`. The administrative pgAdmin screenshots do not satisfy this requirement.
- Administrator must independently validate external firewall restrictions, PostgreSQL HBA access scope, TLS certificate identity/trust settings, backup restoration readiness, and any shared-cluster resource impacts.
- No database creation, role provisioning, migrations, integration execution, or production changes are authorized by this record.
- `sbn_portal_test` and existing databases must remain untouched.
- Do not paste raw SSH/pgAdmin output, host addresses, secrets, credentials, HBA contents, certificates, or private keys into repository artifacts.

## Next controlled step
Obtain administrative confirmation of perimeter protection and recoverable backups, then arrange a separately approved restricted read-only PostgreSQL inspection identity. Re-run the standardized 8AC pgAdmin SELECT from the maintenance database `postgres` using that identity; curate only the allowed non-sensitive result fields. A completed checklist still requires separate approval before provisioning or integration.
