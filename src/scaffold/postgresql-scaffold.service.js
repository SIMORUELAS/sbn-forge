'use strict';

const path =
  require(
    'path'
  );

const fs =
  require(
    'fs-extra'
  );

const {
  spawn
} = require(
  'child_process'
);

class PostgreSqlScaffoldService {
  constructor(
    dependencies = {}
  ) {
    this.fs =
      dependencies.fs ||
      fs;

    this.spawn =
      dependencies.spawn ||
      spawn;

    this.rootDirectory =
      dependencies.rootDirectory ||
      path.resolve(
        __dirname,
        '..',
        '..'
      );

    this.nodeExecutable =
      dependencies.nodeExecutable ||
      process.execPath;

    this.npmExecutable =
      dependencies.npmExecutable ||
      (
        process.platform ===
          'win32'
          ? 'npm.cmd'
          : 'npm'
      );
  }

  async execute(
    options = {}
  ) {
    const configuration =
      this.normalizeOptions(
        options
      );

    this.validateOptions(
      configuration
    );

    const paths =
      await this.preparePaths(
        configuration
      );

    const existingSeeds =
      await this.readExistingSeeds(
        paths.definitionFile,
        configuration.quiet
      );

    this.writeSection(
      `1. Inspeccionando PostgreSQL: ` +
      `${configuration.schema}.` +
      `${configuration.table}`,
      configuration.quiet
    );

    await this.inspectPostgreSql(
      configuration,
      paths
    );

    await this.ensureFileExists(
      paths.definitionFile,
      'No se generó el archivo de definición'
    );

    if (
      existingSeeds.length >
      0
    ) {
      await this.restoreSeeds(
        paths.definitionFile,
        existingSeeds
      );

      this.writeLine(
        `Seeds restaurados: ` +
        `${existingSeeds.length}`,
        configuration.quiet
      );
    }
    else {
      this.writeLine(
        'No se detectaron seeds personalizados para preservar.',
        configuration.quiet
      );
    }

    this.writeSection(
      '2. Validando definición JSON',
      configuration.quiet
    );

    const definition =
      await this.readAndValidateDefinition(
        paths.definitionFile
      );

    const seedCount =
      Array.isArray(
        definition.seeds
      )
        ? definition.seeds.length
        : 0;

    this.writeLine(
      `Definición válida: ` +
      `${paths.definitionFile}`,
      configuration.quiet
    );

    this.writeLine(
      `Schema:   ${definition.schema}`,
      configuration.quiet
    );

    this.writeLine(
      `Tabla:    ${definition.table}`,
      configuration.quiet
    );

    this.writeLine(
      `Columnas: ${definition.columns.length}`,
      configuration.quiet
    );

    this.writeLine(
      `Seeds:    ${seedCount}`,
      configuration.quiet
    );

    this.writeSection(
      `3. Generando módulo con perfil ` +
      configuration.profile,
      configuration.quiet
    );

    await this.generateModule(
      configuration,
      paths
    );

    await this.ensureDirectoryExists(
      paths.moduleDirectory,
      'No se generó el directorio del módulo'
    );

    await this.ensureFileExists(
      paths.manifestFile,
      'No se generó el manifest'
    );

    if (
      configuration.runTests
    ) {
      this.writeSection(
        '4. Ejecutando pruebas',
        configuration.quiet
      );

      await this.runNpmCommand(
        [
          'test'
        ],
        configuration
      );
    }

    if (
      configuration.runLint
    ) {
      this.writeSection(
        configuration.runTests
          ? '5. Ejecutando ESLint'
          : '4. Ejecutando ESLint',
        configuration.quiet
      );

      await this.runNpmCommand(
        [
          'run',
          'lint'
        ],
        configuration
      );
    }

    const generatedFiles =
      await this.listGeneratedFiles(
        paths.moduleDirectory
      );

    const result = {
      source: {
        type:
          'postgresql',

        schema:
          configuration.schema,

        table:
          configuration.table,

        database:
          configuration.database
      },

      profile:
        configuration.profile,

      definitionFile:
        paths.definitionFile,

      moduleDirectory:
        paths.moduleDirectory,

      manifestFile:
        paths.manifestFile,

      seedCount,

      generatedFiles
    };

    this.printSummary(
      result,
      configuration.quiet
    );

    return result;
  }

  normalizeOptions(
    options
  ) {
    return {
      table:
        this.normalizeRequiredString(
          options.table
        ),

      schema:
        this.normalizeOptionalString(
          options.schema,
          'public'
        ),

      host:
        this.normalizeOptionalString(
          options.host,
          'localhost'
        ),

      port:
        Number(
          options.port ||
          5432
        ),

      database:
        this.normalizeRequiredString(
          options.database
        ),

      user:
        this.normalizeOptionalString(
          options.user,
          'postgres'
        ),

      password:
        this.normalizeOptionalString(
          options.password ||
          process.env
            .SBN_POSTGRES_PASSWORD,
          ''
        ),

      profile:
        this.normalizeOptionalString(
          options.profile,
          'sbn-api-v2'
        ),

      definitionsDirectory:
        this.normalizeOptionalString(
          options.definitionsDirectory,
          './examples'
        ),

      output:
        this.normalizeOptionalString(
          options.output,
          './output'
        ),

      force:
        options.force ===
        true,

      runTests:
        options.runTests ===
        true,

      runLint:
        options.runLint ===
        true,

      quiet:
        options.quiet ===
        true
    };
  }

  validateOptions(
    options
  ) {
    if (
      !options.table
    ) {
      throw new TypeError(
        'Debe indicar el nombre de la tabla.'
      );
    }

    if (
      !options.database
    ) {
      throw new TypeError(
        'Debe indicar la base de datos PostgreSQL.'
      );
    }

    if (
      !options.password
    ) {
      throw new TypeError(
        'Debe indicar la contraseña PostgreSQL mediante ' +
        '--password o la variable ' +
        'SBN_POSTGRES_PASSWORD.'
      );
    }

    if (
      !Number.isInteger(
        options.port
      ) ||
      options.port <
        1 ||
      options.port >
        65535
    ) {
      throw new TypeError(
        'El puerto PostgreSQL debe estar entre 1 y 65535.'
      );
    }
  }

  async preparePaths(
    options
  ) {
    const definitionsDirectory =
      this.resolveProjectPath(
        options.definitionsDirectory
      );

    const outputDirectory =
      this.resolveProjectPath(
        options.output
      );

    await this.fs.ensureDir(
      definitionsDirectory
    );

    await this.fs.ensureDir(
      outputDirectory
    );

    const definitionFile =
      path.join(
        definitionsDirectory,
        `${options.table}.json`
      );

    const moduleName =
      this.toKebabCase(
        options.table
      );

    const moduleDirectory =
      path.join(
        outputDirectory,
        'modules',
        moduleName
      );

    const manifestFile =
      path.join(
        moduleDirectory,
        'sbn-forge.manifest.json'
      );

    return {
      definitionsDirectory,
      definitionFile,
      outputDirectory,
      moduleName,
      moduleDirectory,
      manifestFile
    };
  }

  async readExistingSeeds(
    definitionFile,
    quiet
  ) {
    if (
      !await this.fs.pathExists(
        definitionFile
      )
    ) {
      return [];
    }

    try {
      const definition =
        await this.fs.readJson(
          definitionFile
        );

      const seeds =
        Array.isArray(
          definition.seeds
        )
          ? definition.seeds
          : [];

      if (
        seeds.length >
        0
      ) {
        this.writeLine(
          `Seeds existentes detectados: ` +
          `${seeds.length}`,
          quiet
        );
      }

      return seeds;
    }
    catch (
      error
    ) {
      this.writeWarning(
        'No fue posible leer la definición anterior ' +
        'para preservar sus seeds.',
        quiet
      );

      return [];
    }
  }

  async restoreSeeds(
    definitionFile,
    seeds
  ) {
    const definition =
      await this.fs.readJson(
        definitionFile
      );

    definition.seeds =
      seeds;

    await this.fs.writeJson(
      definitionFile,
      definition,
      {
        spaces:
          2
      }
    );
  }

  async inspectPostgreSql(
    options,
    paths
  ) {
    const argumentsList = [
      this.getCliFile(),
      'inspect',
      'postgresql',
      options.table,
      '--schema',
      options.schema,
      '--output',
      paths.definitionFile,
      '--host',
      options.host,
      '--port',
      String(
        options.port
      ),
      '--database',
      options.database,
      '--user',
      options.user,
      '--password',
      options.password
    ];

    if (
      options.quiet
    ) {
      argumentsList.push(
        '--quiet'
      );
    }

    await this.runCommand(
      this.nodeExecutable,
      argumentsList,
      {
        cwd:
          this.rootDirectory,

        quiet:
          options.quiet,

        errorMessage:
          'Falló la inspección PostgreSQL.'
      }
    );
  }

  async generateModule(
    options,
    paths
  ) {
    const argumentsList = [
      this.getCliFile(),
      'generate',
      'api',
      options.table,
      '--profile',
      options.profile,
      '--definition',
      paths.definitionFile,
      '--output',
      paths.outputDirectory
    ];

    if (
      options.force
    ) {
      argumentsList.push(
        '--force'
      );
    }

    await this.runCommand(
      this.nodeExecutable,
      argumentsList,
      {
        cwd:
          this.rootDirectory,

        quiet:
          options.quiet,

        errorMessage:
          'Falló la generación del módulo.'
      }
    );
  }

  async runNpmCommand(
    argumentsList,
    options
  ) {
    await this.runCommand(
      this.npmExecutable,
      argumentsList,
      {
        cwd:
          this.rootDirectory,

        quiet:
          options.quiet,

        errorMessage:
          `Falló npm ${argumentsList.join(' ')}.`
      }
    );
  }

  runCommand(
    command,
    argumentsList,
    options = {}
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const quiet =
          options.quiet ===
          true;

        const child =
          this.spawn(
            command,
            argumentsList,
            {
              cwd:
                options.cwd ||
                this.rootDirectory,

              env: {
                ...process.env
              },

              shell:
                false,

              stdio:
                quiet
                  ? [
                      'ignore',
                      'pipe',
                      'pipe'
                    ]
                  : 'inherit'
            }
          );

        let standardOutput =
          '';

        let standardError =
          '';

        if (
          quiet
        ) {
          child.stdout?.on(
            'data',
            chunk => {
              standardOutput +=
                chunk.toString();
            }
          );

          child.stderr?.on(
            'data',
            chunk => {
              standardError +=
                chunk.toString();
            }
          );
        }

        child.on(
          'error',
          error => {
            reject(
              new Error(
                `${options.errorMessage || 'Falló el comando.'} ` +
                error.message
              )
            );
          }
        );

        child.on(
          'close',
          exitCode => {
            if (
              exitCode ===
              0
            ) {
              resolve({
                exitCode,
                standardOutput,
                standardError
              });

              return;
            }

            const details =
              standardError.trim() ||
              standardOutput.trim();

            reject(
              new Error(
                [
                  options.errorMessage ||
                    'El comando terminó con error.',

                  `Código de salida: ${exitCode}.`,

                  details
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ' '
                  )
              )
            );
          }
        );
      }
    );
  }

  async readAndValidateDefinition(
    definitionFile
  ) {
    let definition;

    try {
      definition =
        await this.fs.readJson(
          definitionFile
        );
    }
    catch (
      error
    ) {
      throw new Error(
        `La definición no contiene JSON válido: ` +
        `${definitionFile}. ` +
        error.message
      );
    }

    if (
      !definition ||
      typeof definition !==
        'object'
    ) {
      throw new TypeError(
        'La definición generada debe ser un objeto.'
      );
    }

    if (
      typeof definition.schema !==
        'string' ||
      definition.schema.trim() ===
        ''
    ) {
      throw new TypeError(
        'La definición generada no contiene schema.'
      );
    }

    if (
      typeof definition.table !==
        'string' ||
      definition.table.trim() ===
        ''
    ) {
      throw new TypeError(
        'La definición generada no contiene table.'
      );
    }

    if (
      !Array.isArray(
        definition.columns
      ) ||
      definition.columns.length ===
        0
    ) {
      throw new TypeError(
        'La definición generada no contiene columnas.'
      );
    }

    return definition;
  }

  async ensureFileExists(
    file,
    message
  ) {
    if (
      !await this.fs.pathExists(
        file
      )
    ) {
      throw new Error(
        `${message}: ${file}`
      );
    }

    const stat =
      await this.fs.stat(
        file
      );

    if (
      !stat.isFile()
    ) {
      throw new Error(
        `${message}: ${file}`
      );
    }
  }

  async ensureDirectoryExists(
    directory,
    message
  ) {
    if (
      !await this.fs.pathExists(
        directory
      )
    ) {
      throw new Error(
        `${message}: ${directory}`
      );
    }

    const stat =
      await this.fs.stat(
        directory
      );

    if (
      !stat.isDirectory()
    ) {
      throw new Error(
        `${message}: ${directory}`
      );
    }
  }

  async listGeneratedFiles(
    moduleDirectory
  ) {
    const files =
      [];

    const walk =
      async currentDirectory => {
        const entries =
          await this.fs.readdir(
            currentDirectory,
            {
              withFileTypes:
                true
            }
          );

        for (
          const entry of entries
        ) {
          const absolutePath =
            path.join(
              currentDirectory,
              entry.name
            );

          if (
            entry.isDirectory()
          ) {
            await walk(
              absolutePath
            );

            continue;
          }

          if (
            entry.isFile()
          ) {
            files.push(
              path.relative(
                moduleDirectory,
                absolutePath
              )
            );
          }
        }
      };

    await walk(
      moduleDirectory
    );

    return files.sort(
      (
        left,
        right
      ) =>
        left.localeCompare(
          right
        )
    );
  }

  printSummary(
    result,
    quiet
  ) {
    if (
      quiet
    ) {
      return;
    }

    this.writeSection(
      'Proceso completado correctamente',
      false
    );

    this.writeLine(
      `Tabla:      ` +
      `${result.source.schema}.` +
      `${result.source.table}`,
      false
    );

    this.writeLine(
      `Base:       ` +
      `${result.source.database}`,
      false
    );

    this.writeLine(
      `Definición: ` +
      `${result.definitionFile}`,
      false
    );

    this.writeLine(
      `Módulo:     ` +
      `${result.moduleDirectory}`,
      false
    );

    this.writeLine(
      `Perfil:     ` +
      `${result.profile}`,
      false
    );

    this.writeLine(
      `Manifest:   ` +
      `${result.manifestFile}`,
      false
    );

    this.writeLine(
      `Seeds:      ` +
      `${result.seedCount}`,
      false
    );

    console.log(
      ''
    );

    console.log(
      'Archivos generados:'
    );

    for (
      const generatedFile of
      result.generatedFiles
    ) {
      console.log(
        `  [ok] ${generatedFile}`
      );
    }
  }

  getCliFile() {
    return path.join(
      this.rootDirectory,
      'bin',
      'sbn-forge.js'
    );
  }

  resolveProjectPath(
    value
  ) {
    if (
      path.isAbsolute(
        value
      )
    ) {
      return path.resolve(
        value
      );
    }

    return path.resolve(
      this.rootDirectory,
      value
    );
  }

  toKebabCase(
    value
  ) {
    return String(
      value
    )
      .trim()
      .replace(
        /([a-z0-9])([A-Z])/g,
        '$1-$2'
      )
      .replace(
        /[^a-zA-Z0-9]+/g,
        '-'
      )
      .replace(
        /^-+|-+$/g,
        ''
      )
      .toLowerCase();
  }

  normalizeRequiredString(
    value
  ) {
    if (
      typeof value !==
        'string'
    ) {
      return '';
    }

    return value.trim();
  }

  normalizeOptionalString(
    value,
    fallback
  ) {
    if (
      typeof value !==
        'string' ||
      value.trim() ===
        ''
    ) {
      return fallback;
    }

    return value.trim();
  }

  writeSection(
    title,
    quiet
  ) {
    if (
      quiet
    ) {
      return;
    }

    console.log(
      ''
    );

    console.log(
      '============================================================'
    );

    console.log(
      title
    );

    console.log(
      '============================================================'
    );
  }

  writeLine(
    message,
    quiet
  ) {
    if (
      !quiet
    ) {
      console.log(
        message
      );
    }
  }

  writeWarning(
    message,
    quiet
  ) {
    if (
      !quiet
    ) {
      console.warn(
        `Advertencia: ${message}`
      );
    }
  }
}

module.exports =
  PostgreSqlScaffoldService;