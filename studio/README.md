# SBN Forge Studio — STUDIO-01

Prototipo **local y de solo lectura** de la interfaz visual aprobada. No es un módulo autenticado del Portal SBN y no debe publicarse ni exponerse a Internet.

## Ejecución

Desde la raíz de `sbn-forge`:

```powershell
node .\studio\server.js
```

Abrir http://127.0.0.1:4173

El servidor solo escucha en loopback y solo permite archivos estáticos conocidos. No almacena conexiones, credenciales, sesiones ni ejecuta generación. El indicador «Prototipo local» se mantiene visible.

## Próximos bloques

- STUDIO-02: backend de Studio con autenticación y permisos reales del Portal SBN; conexiones PostgreSQL gestionadas en servidor; inspector integrado.
- STUDIO-03: diseñador de módulos y definición persistente.
- STUDIO-04: previsualización con ForgeRuntime.
- STUDIO-05: ejecutar el motor en entorno aislado, revisar y descargar artefactos.
- STUDIO-06: auditoría, historial, versionado y publicación explícita y autorizada.

No conectar directamente el navegador a PostgreSQL ni reutilizar tokens del portal en el prototipo.
