# Studio — Conexiones PostgreSQL (primera integración segura)

La sección **Conexiones** ahora muestra la conexión autorizada por variables de entorno, permite comprobar su disponibilidad con una consulta SELECT de solo lectura y abre el Inspector PostgreSQL.

Configuración en la consola local ANTES de iniciar `node .\\studio\\server.js`:

```powershell
$env:FORGE_STUDIO_DB_INSPECT = "1"
$env:FORGE_STUDIO_DB_HOST = "127.0.0.1"
$env:FORGE_STUDIO_DB_PORT = "5432"
$env:FORGE_STUDIO_DB_NAME = "BASE_AUTORIZADA"
$env:FORGE_STUDIO_DB_USER = "USUARIO_SOLO_LECTURA"
$env:FORGE_STUDIO_DB_PASSWORD = Read-Host "Contraseña PostgreSQL"
node .\\studio\\server.js
```

**No copies valores de ejemplo como si fueran conexiones reales.** La contraseña permanece en el proceso local, no se envía a la interfaz ni se guarda en el repositorio. Las variables de entorno no sustituyen una cuenta con permisos SELECT limitados en PostgreSQL.

Esta primera integración **no permite crear, editar, guardar o alternar múltiples perfiles desde el navegador**. Esa función requiere un almacén seguro de credenciales y controles de autorización separados. La comprobación de conexión no crea bases, tablas, usuarios ni registros, y no autoriza escrituras, instalación ni publicación. No se han probado conexiones reales en este macro-bloque.
