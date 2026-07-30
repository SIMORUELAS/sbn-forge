'use strict';

const path = require('node:path');

const {
  PostgresDatasource
} = require(
  '../src/datasources/postgresql'
);

const PostgreSqlInspector = require(
  '../src/inspectors/postgresql/postgresql-inspector'
);

const MetadataNormalizer = require(
  '../src/context/metadata-normalizer'
);

const DefinitionBuilder = require(
  '../src/core/definition-builder'
);

const DefinitionWriter = require(
  '../src/core/definition-writer'
);

async function main() {
  const schema =
    process.env.SBN_FORGE_DB_SCHEMA;

  const table =
    process.env.SBN_FORGE_DB_TABLE;

  const datasource = new PostgresDatasource({
    host: process.env.SBN_FORGE_DB_HOST,

    port: Number(
      process.env.SBN_FORGE_DB_PORT || 5432
    ),

    database:
      process.env.SBN_FORGE_DB_NAME,

    user:
      process.env.SBN_FORGE_DB_USER,

    password:
      process.env.SBN_FORGE_DB_PASSWORD,

    ssl:
      process.env.SBN_FORGE_DB_SSL === 'true'
        ? {
            rejectUnauthorized: false
          }
        : false
  });

  const inspector =
    new PostgreSqlInspector(datasource);

  const normalizer =
    new MetadataNormalizer();

  const builder =
    new DefinitionBuilder();

  const writer =
    new DefinitionWriter();

  try {
    const metadata = await inspector.inspect({
      schema,
      table
    });

    const normalizedMetadata =
      normalizer.normalize(metadata);

    const definition = builder.build(
      normalizedMetadata
    );

    const outputPath = path.join(
      process.cwd(),
      'examples',
      `${table}.json`
    );

    const writtenPath = await writer.write(
      definition,
      outputPath
    );

    console.log('');
    console.log(
      'Definición generada correctamente.'
    );

    console.log(
      `Tabla: ${schema}.${table}`
    );

    console.log(
      `Archivo: ${writtenPath}`
    );

    console.log('');

    console.log(
      JSON.stringify(definition, null, 2)
    );
  } finally {
    await datasource.close();
  }
}

main().catch((error) => {
  console.error('');
  console.error(
    'No fue posible generar la definición.'
  );

  console.error(error.message);

  if (error.code) {
    console.error(
      `Código: ${error.code}`
    );
  }

  process.exitCode = 1;
});