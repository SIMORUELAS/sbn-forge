'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const DefinitionWriter = require(
  '../src/core/definition-writer'
);

describe('DefinitionWriter', () => {
  test('guarda una definición en formato JSON', async () => {
    const writer = new DefinitionWriter();

    const temporaryDirectory = await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'sbn-forge-definition-writer-'
      )
    );

    const outputPath = path.join(
      temporaryDirectory,
      'definitions',
      'ai_business_model_teams.json'
    );

    const definition = {
      schema: 'simo_ai',
      table: 'ai_business_model_teams',
      columns: [
        {
          name: 'id',
          type: 'bigint',
          nullable: false,
          primaryKey: true,
          generated: true,
          writable: false,
          foreignKey: null
        }
      ]
    };

    const writtenPath = await writer.write(
      definition,
      outputPath
    );

    const fileContent = await fs.readFile(
      writtenPath,
      'utf8'
    );

    expect(writtenPath).toBe(
      path.resolve(outputPath)
    );

    expect(JSON.parse(fileContent)).toEqual(
      definition
    );

    await fs.rm(temporaryDirectory, {
      recursive: true,
      force: true
    });
  });

  test('crea la carpeta destino si no existe', async () => {
    const writer = new DefinitionWriter();

    const temporaryDirectory = await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'sbn-forge-definition-writer-directory-'
      )
    );

    const outputPath = path.join(
      temporaryDirectory,
      'one',
      'two',
      'definition.json'
    );

    await writer.write(
      {
        schema: 'simo_ai',
        table: 'test_table',
        columns: []
      },
      outputPath
    );

    const fileExists = await fs
      .access(outputPath)
      .then(() => true)
      .catch(() => false);

    expect(fileExists).toBe(true);

    await fs.rm(temporaryDirectory, {
      recursive: true,
      force: true
    });
  });

  test('rechaza una definición inválida', async () => {
    const writer = new DefinitionWriter();

    await expect(
      writer.write(
        null,
        'examples/definition.json'
      )
    ).rejects.toThrow(
      'definition debe ser un objeto válido'
    );
  });

  test('rechaza una ruta inválida', async () => {
    const writer = new DefinitionWriter();

    await expect(
      writer.write(
        {
          schema: 'simo_ai',
          table: 'test_table',
          columns: []
        },
        ''
      )
    ).rejects.toThrow(
      'outputPath debe ser una ruta válida'
    );
  });
});