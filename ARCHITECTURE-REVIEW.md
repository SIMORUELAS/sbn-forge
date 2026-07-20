# Revisión de arquitectura – ETAPA 1

## Decisión

La arquitectura propuesta es correcta para SBN Forge v0.1.0 y se conserva con ajustes menores de endurecimiento.

## Fortalezas

1. `Generator Context` desacopla las plantillas del origen de metadatos. En ETAPA 2 el inspector PostgreSQL podrá reemplazar al JSON sin reescribir generadores.
2. CLI, núcleo, plantillas y generadores tienen responsabilidades independientes.
3. CommonJS mantiene compatibilidad directa con las APIs Fastify actuales de SBN.
4. `FileWriter` centraliza `--force` y `--dry-run`, evitando sobrescrituras accidentales.
5. El manifest hace trazable cada generación mediante versión, hash de definición, capacidades y archivos.

## Ajustes aplicados

- Se agregó `definition-loader` y `definition-validator` como frontera de entrada.
- Se normalizan tipos antes de renderizar plantillas.
- Se agregó whitelist de columnas escribibles y de ordenamiento.
- El SQL generado utiliza parámetros para valores; únicamente columnas validadas entran en fragmentos dinámicos.
- El repositorio generado recibe la conexión por `configure(database)` para evitar dependencias globales ocultas.
- La autenticación y las policies permanecen como integración del host en v0.1.0; no se simula seguridad incompleta dentro del generador.

## Riesgos que quedan para etapas posteriores

- Pluralización inglesa simple; deberá sustituirse por un diccionario SBN o metadato explícito.
- Tipos PostgreSQL avanzados todavía no están soportados.
- Falta generación de policies, eventos, Outbox y transacciones de dominio.
- Los schemas base no convierten bigint a string; el mapper formal se agregará en la etapa backend completa.
