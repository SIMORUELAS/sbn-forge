# Macro-block 8AC — SSH + pgAdmin read-only evidence collection

**Scope:** safe, operator-run observation only. No remote execution by SBN Forge, no schema changes, no roles, no credentials in reports, no test database provisioning.

## SSH: host observations (run only on the authorized host)

These commands display basic host and service facts without changing them:

```sh
uname -s
cat /etc/os-release
systemctl list-units --type=service --all 'postgresql*' --no-pager
ss -ltn
```

If `systemctl` or `ss` is unavailable, record that the check is unavailable. Do not use `sudo` just to make the checklist pass. The listening socket list is not proof of firewall access restrictions. Ask the host administrator to independently review firewall policy, `pg_hba.conf` access rules and TLS server certificate configuration. **Do not copy `pg_hba.conf`, certificates, private keys, environment variables, process command lines or credentials into chat, GitHub or reports.** Host OS evidence alone cannot establish a restricted PostgreSQL login.

## pgAdmin: database observations

Use an independently approved restricted read-only inspection login and connect to the maintenance database `postgres` (not `sbn_portal_test`). In Query Tool run only this SELECT:

```sql
SELECT current_database() AS database_name,
       current_setting('server_version_num')::integer AS server_version_num,
       (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS ssl_active,
       (SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
          FROM pg_roles WHERE rolname = current_user) AS privileged_role,
       (SELECT pg_has_role(current_user, d.datdba, 'MEMBER')
          FROM pg_database d WHERE d.datname = current_database()) AS database_owner_member,
       has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
       has_schema_privilege(current_user, 'public', 'CREATE') AS public_create;
```

The result is not proof of certificate identity verification. Confirm pgAdmin SSL mode and trust settings independently; do not weaken certificate checks. If you only have a superuser login, **do not use it for this automated/standardized inspection**; request a restricted inspection account first.

## Offline consolidation

The `reviewDualChannel({ssh, pgadmin, confirmations})` function in `studio/linux-postgres-dual-channel-review.js` accepts manually curated booleans and non-sensitive database facts. It does not execute SSH or SQL. No values are accepted as authorization to run integration tests. A complete checklist means only `DUAL_CHANNEL_REVIEW_READY` for administrator review.

The existing `postgres` and `sbn_portal_test` databases remain untouched. The proposed `sbn_forge_execution_test` requires a separate approval and guarded provisioning procedure.

Local validation:

```powershell
git pull --ff-only
npm run lint
npm test
```
