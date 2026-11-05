-- SBN Forge execution-registry: READ-ONLY access inventory.
-- Run as an authorized administrator against database postgres on the intended local instance.
-- No CREATE, ALTER, GRANT, REVOKE, INSERT, UPDATE, DELETE or DO statements.
-- This is a snapshot; effective privileges can change before provisioning.
SELECT current_database() AS connected_database,
       current_user AS connected_role,
       inet_server_addr() AS server_address,
       inet_server_port() AS server_port,
       current_setting('server_version') AS server_version;

SELECT d.datname AS database_name,
       pg_get_userbyid(d.datdba) AS owner_name,
       d.datallowconn AS connections_allowed,
       EXISTS (SELECT 1 FROM aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
               WHERE a.grantee = 0 AND a.privilege_type = 'CONNECT') AS public_connect,
       EXISTS (SELECT 1 FROM aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
               WHERE a.grantee = 0 AND a.privilege_type = 'CREATE') AS public_create,
       EXISTS (SELECT 1 FROM aclexplode(COALESCE(d.datacl, acldefault('d', d.datdba))) a
               WHERE a.grantee = 0 AND a.privilege_type = 'TEMPORARY') AS public_temp
FROM pg_database d
WHERE NOT d.datistemplate
ORDER BY d.datname;

SELECT r.rolname AS role_name,
       r.rolcanlogin AS can_login,
       r.rolsuper AS superuser,
       r.rolcreatedb AS create_database,
       r.rolcreaterole AS create_roles,
       r.rolreplication AS replication,
       r.rolbypassrls AS bypass_rls
FROM pg_roles r
WHERE r.rolcanlogin OR r.rolname IN ('sbn_forge_test_runner')
ORDER BY r.rolname;

SELECT datname AS proposed_database_name,
       'ALREADY_EXISTS_DO_NOT_OVERWRITE' AS status
FROM pg_database WHERE datname = 'sbn_forge_execution_test';

SELECT rolname AS proposed_runner_name,
       'ALREADY_EXISTS_DO_NOT_OVERWRITE' AS status
FROM pg_roles WHERE rolname = 'sbn_forge_test_runner';
