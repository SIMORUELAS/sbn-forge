# SBN Forge dentro del ecosistema SBN

## Decisión arquitectónica oficial

SBN Forge es un **proyecto independiente** y, al mismo tiempo, un componente oficial del ecosistema SIMO BUSINESS NETWORKS.

No debe incorporarse dentro del código de `sbn-api`, porque ambos productos tienen responsabilidades, usuarios y ciclos de ejecución diferentes:

- **SBN Platform** ejecuta procesos empresariales para los clientes.
- **SBN Forge** es una herramienta de ingeniería que genera código para los proyectos SBN.

## Organización recomendada

```text
SBN/
├── sbn-api
├── sbn-portal
├── sbn-connect
├── sbn-agents
├── sbn-marketplace
├── sbn-analytics
├── sbn-forge
├── shared
│   ├── sbn-core
│   ├── sbn-security
│   ├── sbn-events
│   ├── sbn-validation
│   ├── sbn-sdk
│   └── sbn-ui
└── docs
```

Cada carpeta puede mantenerse como repositorio independiente o administrarse posteriormente mediante un monorepo. La independencia lógica debe conservarse en ambos casos.

## Dirección de la dependencia

La relación correcta es:

```text
Desarrollador
    ↓
SBN Forge
    ↓
Código generado
    ↓
Proyecto SBN
```

SBN Forge no debe importar directamente módulos internos de `sbn-api`. Debe generar código compatible mediante contratos, convenciones, templates y paquetes compartidos versionados.

```text
sbn-forge ──────→ genera código compatible
                       ↓
                 sbn-api / sbn-connect
                       ↑
                 paquetes @sbn/*
```

## Librerías compartidas futuras

La ETAPA 1 no requiere crear todavía estos paquetes. Sin embargo, el código generado debe prepararse para consumir en versiones posteriores:

- `@sbn/core`
- `@sbn/security`
- `@sbn/events`
- `@sbn/validation`
- `@sbn/sdk`
- `@sbn/ui`

Estos paquetes deben publicarse y versionarse de forma independiente. Forge podrá declarar qué versión del estándar SBN utilizó dentro del manifest de generación.

## Versionamiento independiente

Ejemplo:

```text
SBN API       v3.4.1
SBN Portal    v2.8.0
SBN Connect   v1.2.0
SBN Forge     v0.1.0
```

Actualizar Forge no debe obligar a desplegar la plataforma productiva. De igual manera, desplegar la SBN no debe requerir instalar el CLI de Forge en los servidores de clientes.

## Componentes futuros de Forge

```text
SBN Forge
├── Forge CLI
├── Forge Studio
└── Forge AI
```

- **Forge CLI:** generación mediante línea de comandos.
- **Forge Studio:** interfaz visual para configurar y generar módulos.
- **Forge AI:** análisis arquitectónico, detección de patrones y generación asistida.

La versión 0.1.0 implementa solamente el primer núcleo de **Forge CLI**.

## Regla de despliegue

SBN Forge debe instalarse en equipos de desarrollo, integración continua o servidores de construcción. No forma parte del runtime normal de los clientes.

## Conclusión

SBN Forge pertenece oficialmente a la familia SBN, pero debe conservar:

1. Repositorio y código independientes.
2. Ciclo de versiones propio.
3. Dependencias mediante contratos y paquetes compartidos.
4. Capacidad futura para generar proyectos adicionales sin acoplarse al backend productivo.
