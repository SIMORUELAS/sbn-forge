# Studio functional integration — first block: Modules workspace

This block replaces the generic placeholder in the **Módulos** navigation item with a real local read-only inventory.

The browser calls the existing endpoints `GET /api/studio/definitions`, `GET /api/studio/runs`, and `GET /api/studio/preview/:name`. It shows saved definition names, counts matching historical runs, and allows previewing the selected module's Forge contract. It also links back to the existing designer.

No new database access, credential management, server writes, generation, publication, installation, or production permissions are introduced. If a list endpoint fails, the workspace reports an error and clears the table rather than displaying fabricated data.

The other placeholder sections (Conexiones, Plantillas, Reglas SBN, Configuración) remain pending functional implementation. The Historial workspace already exists; it should be validated visually before any replacement.

## Local validation

```powershell
git pull --ff-only
git log -1 --oneline
npm run lint
npm test
git status --short
```

Restart the existing `node .\studio\server.js` process to load the updated static assets, then open `http://127.0.0.1:4173/#modulos`. Confirm the inventory and preview, without connecting to SIMOTECNOLOGIAS.
