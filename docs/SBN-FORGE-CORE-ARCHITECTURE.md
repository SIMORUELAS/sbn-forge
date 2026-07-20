# SBN Forge Core Architecture

## Propósito

SBN Forge es el generador oficial de software del ecosistema SBN.

El núcleo debe permanecer independiente del origen de los metadatos y de los
tipos de artefactos generados.

## Flujo

Definition Source
→ Inspector
→ Generator Context
→ Rule Engine
→ Generator
→ Template Engine
→ Output Writer
→ Manifest

## Contratos internos

- InspectorContract
- RuleContract
- GeneratorContract
- TemplateEngineContract
- OutputWriterContract

## Regla fundamental

Las plantillas nunca deben consumir directamente metadatos de PostgreSQL,
SQL Server, Firebird, JSON u otra fuente.

Todas deben consumir exclusivamente el Generator Context normalizado.

## Fuentes futuras

- JSON
- PostgreSQL
- SQL Server
- Firebird
- MySQL
- Definiciones IA

## Generadores futuros

- Backend Fastify
- Frontend Next.js
- Documentación
- OpenAPI
- Postman
- Testing
- Migrations
- SDK