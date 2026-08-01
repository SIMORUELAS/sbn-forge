'use strict';

const fs =
  require('fs-extra');

const path =
  require('path');

const definition =
  require(
    '../examples/ai_business_models.json'
  );

const {
  generateTestModule
} = require(
  './helpers/generate-test-module'
);

describe(
  'Data Dictionary Generator',
  () => {
    test(
      'genera un diccionario de datos completo',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile:
              'sbn-api-v2'
          });

        try {
          const dictionaryPath =
            path.join(
              generated.moduleDirectory,
              'DATA_DICTIONARY.md'
            );

          expect(
            await fs.pathExists(
              dictionaryPath
            )
          ).toBe(true);

          const dictionary =
            await fs.readFile(
              dictionaryPath,
              'utf8'
            );

          // Encabezado

          expect(
            dictionary
          ).toContain(
            '# Data Dictionary'
          );

          expect(
            dictionary
          ).toContain(
            'Módulo: **ai-business-models**'
          );

          expect(
            dictionary
          ).toContain(
            'Schema:'
          );

          expect(
            dictionary
          ).toContain(
            'simo_ai'
          );

          expect(
            dictionary
          ).toContain(
            'Tabla:'
          );

          expect(
            dictionary
          ).toContain(
            'ai_business_models'
          );

          // Columnas principales

          expect(
            dictionary
          ).toContain(
            '## id'
          );

          expect(
            dictionary
          ).toContain(
            '## code'
          );

          expect(
            dictionary
          ).toContain(
            '## configuration_json'
          );

          expect(
            dictionary
          ).toContain(
            '## metadata'
          );

          // Información técnica

          expect(
            dictionary
          ).toContain(
            '| Primary Key | true |'
          );

          expect(
            dictionary
          ).toContain(
            '| Tipo | uuid |'
          );

          expect(
            dictionary
          ).toContain(
            '| Nullable | false |'
          );

          expect(
            dictionary
          ).toContain(
            '| Writable | false |'
          );

          expect(
            dictionary
          ).toContain(
            '| Default | gen_random_uuid() |'
          );

          // JSON Schema

          expect(
            dictionary
          ).toContain(
            '### JSON Schema'
          );

          expect(
            dictionary
          ).toContain(
            '"type": "string"'
          );

          expect(
            dictionary
          ).toContain(
            '"format": "uuid"'
          );

          expect(
            dictionary
          ).toContain(
            '"type": "object"'
          );

          // Relaciones

          expect(
            dictionary
          ).toContain(
            '# Llaves foráneas'
          );

          expect(
            dictionary
          ).toContain(
            '| Schema destino | public |'
          );

          expect(
            dictionary
          ).toContain(
            '| Tabla destino | users |'
          );

          expect(
            dictionary
          ).toContain(
            '| Columna destino | id |'
          );

          // Columnas escribibles y obligatorias

          expect(
            dictionary
          ).toContain(
            '# Columnas escribibles'
          );

          expect(
            dictionary
          ).toContain(
            '- `code`'
          );

          expect(
            dictionary
          ).toContain(
            '- `name`'
          );

          expect(
            dictionary
          ).toContain(
            '# Columnas obligatorias para creación'
          );

          // Capacidades

          expect(
            dictionary
          ).toContain(
            '| Soft Delete | true |'
          );

          expect(
            dictionary
          ).toContain(
            '| Optimistic Lock | true |'
          );

          expect(
            dictionary
          ).toContain(
            '| Foreign Keys | true |'
          );

          expect(
            dictionary
          ).toContain(
            '| Auditoría | true |'
          );

          expect(
            dictionary
          ).toContain(
            'Generado automáticamente por **SBN Forge**'
          );
        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);