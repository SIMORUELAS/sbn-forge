# SBN Forge v0.1.0

**La Forja de APIs y módulos de SIMO Business Networks.**

Esta entrega implementa la **ETAPA 1 – Núcleo del Generador**. Recibe una definición JSON, la valida, construye un `Generator Context` estable y genera un módulo backend compatible con Fastify CommonJS.

## Ubicación oficial en la arquitectura SBN

SBN Forge es un **proyecto independiente**, pero forma parte oficialmente del ecosistema SIMO BUSINESS NETWORKS. No debe instalarse dentro de `sbn-api` ni ejecutarse como parte del backend productivo de los clientes.

Organización recomendada:

```text
SBN/
├── sbn-api
├── sbn-portal
├── sbn-connect
├── sbn-forge       ← este proyecto
├── shared
│   ├── sbn-core
│   ├── sbn-security
│   ├── sbn-events
│   ├── sbn-validation
│   └── sbn-sdk
└── docs
```

Forge genera código compatible con la SBN mediante convenciones, templates, manifests y, en etapas futuras, paquetes compartidos `@sbn/*`. Consulta [docs/SBN-ECOSYSTEM-ARCHITECTURE.md](./docs/SBN-ECOSYSTEM-ARCHITECTURE.md).

## Requisitos

- Node.js 18.18 o superior
- npm 9 o superior
- Windows 10/11, Windows Server o Ubuntu

## Instalación

```bash
npm install
npm link
```

## Generar el módulo certificado

```bash
sbn-forge generate api ai_business_model_departments \
  --schema simo_ai \
  --definition ./examples/ai_business_model_departments.json \
  --output ./output
```

En PowerShell puede ejecutarse en una sola línea:

```powershell
sbn-forge generate api ai_business_model_departments --schema simo_ai --definition .\examples\ai_business_model_departments.json --output .\output
```

Opciones:

- `--force`: permite sobrescribir los archivos destino.
- `--dry-run`: valida y muestra el plan sin escribir archivos.
- `--quiet`: reduce mensajes del CLI.

También puede ejecutarse sin `npm link`:

```bash
node ./bin/sbn-forge.js generate api ai_business_model_departments --definition ./examples/ai_business_model_departments.json --output ./output
```

## Arquitectura implementada

```text
Definición JSON
    ↓
Definition Loader + Validator
    ↓
Generator Context
    ↓
Template Engine (Handlebars)
    ↓
Output Manager + File Writer
    ↓
Módulo Fastify + README + Manifest
```

## Salida v0.1.0

- routes
- controller
- service
- repository PostgreSQL parametrizado
- schemas Fastify
- README del módulo
- `sbn-forge.manifest.json`

## Pruebas

```bash
npm test
npm run lint
```

## Límites deliberados de la ETAPA 1

Esta versión todavía no inspecciona PostgreSQL, no genera frontend y no implementa el motor completo de reglas. Esas responsabilidades corresponden a etapas posteriores y se conectarán al mismo `Generator Context` sin modificar las plantillas base.

## Integración del módulo generado

El repositorio generado expone `configure(database)` para recibir el cliente PostgreSQL del host. Las rutas se registran como un plugin Fastify. La autenticación JWT y la autorización por permisos se mantienen en el host SBN, evitando acoplar el generador a una implementación concreta de seguridad en esta primera etapa.
