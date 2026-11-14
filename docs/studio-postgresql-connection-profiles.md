# SBN Forge Studio — administración local de conexiones PostgreSQL

En **Conexiones** se pueden crear, editar, eliminar y probar perfiles de PostgreSQL. La interfaz nunca recibe las contraseñas guardadas. Los perfiles se cifran con AES-256-GCM en un archivo local fuera del repositorio. El Inspector puede utilizar un perfil después de verificarlo.

## Activación segura (PowerShell)

Detén Studio y configura una clave persistente de 32 bytes (64 caracteres hexadecimales), guardada fuera del repositorio. No publiques ni compartas esta clave; perderla impide descifrar los perfiles. Para pruebas locales, en una consola PowerShell nueva:

```powershell
$env:FORGE_STUDIO_CONNECTION_PROFILES = "1"
$env:FORGE_STUDIO_CONNECTION_KEY = (Read-Host "Clave AES-256 en hexadecimal")
$env:FORGE_STUDIO_ALLOWED_DB_HOSTS = "127.0.0.1,localhost"
node .\\studio\\server.js
```

El operador debe añadir explícitamente al allowlist cualquier otro host de PostgreSQL aprobado, antes de reiniciar Studio. Los perfiles no habilitan escritura: el adaptador fuerza `default_transaction_read_only=on` y verifica esa propiedad en la prueba de conexión. Es necesario además un usuario PostgreSQL con privilegios mínimos SELECT.

**Límites:** solo accesible en el servidor local 127.0.0.1; las acciones de escritura de perfiles exigen cabecera local explícita y comprobación de Origin/Host. La clave debe gestionarse de forma segura fuera del repositorio; no hay integración con Windows Credential Manager ni autenticación multiusuario. Evita usar esta interfaz en un equipo compartido o expuesto. El archivo cifrado se guarda en `~/.sbn-forge-studio/connections.enc.json`; la seguridad de permisos depende también del sistema operativo. El cifrado no sustituye el aislamiento del sistema.

No se crean bases, usuarios, tablas, datos ni se publican módulos. Las pruebas automatizadas usan un archivo temporal y no realizan conexiones PostgreSQL reales.
