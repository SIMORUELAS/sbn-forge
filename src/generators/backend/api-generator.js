'use strict';

const path = require('path');

const {
  TemplateEngine
} = require('../../core/template-engine');

const {
  FileWriter
} = require('../../core/file-writer');

const {
  OutputManager
} = require('../../core/output-manager');

const FILE_CATALOG =
  require('../../catalogs/file-catalog');

const GENERIC_FILES = [
  'routes',
  'controller',
  'service',
  'repository',
  'schema',
  'readme'
];

/**
 * Genera un módulo API Fastify.
 *
 * Compatible con:
 *
 * - El contexto heredado de SBN Forge 0.1.0.
 * - GeneratorContextBuilder.
 * - Perfil generic.
 * - Perfil sbn-api-v2.
 */
async function generateApi(
  context,
  {
    output = './output',
    force = false,
    dryRun = false,
    logger = {
      info() {}
    }
  } = {}
) {
  validateContext(context);

  const normalizedContext =
    normalizeTemplateContext(context);

  const templatesDirectory =
    path.resolve(
      __dirname,
      '../../templates'
    );

  const engine =
    new TemplateEngine({
      templatesDirectory
    });

  const moduleName =
    getModuleName(normalizedContext);

  const manager =
    new OutputManager({
      output,
      moduleName
    });

  const writer =
    new FileWriter({
      force,
      dryRun
    });

  await manager.prepare({
    dryRun
  });

  const files = [];

  const selectedTemplates =
    resolveTemplates(
      normalizedContext
    );

  for (
    const templateDefinition
    of selectedTemplates
  ) {
    const relativePath =
      templateDefinition.fileName(
        normalizedContext
      );

    const target =
      manager.resolve(
        relativePath
      );

    const content =
      await engine.render(
        templateDefinition.template,
        normalizedContext
      );

    await writer.write(
      target,
      content
    );

    files.push({
      key:
        templateDefinition.key,

      template:
        templateDefinition.template,

      category:
        templateDefinition.category,

      relativePath:
        manager.relative(target),

      absolutePath:
        target
    });

    logger.info(
      `Generado ${relativePath}`
    );
  }

  const manifestDefinition =
    FILE_CATALOG.manifest || {
      output:
        'sbn-forge.manifest.json',

      category:
        'metadata'
    };

  const manifestRelativePath =
    resolveOutputPath(
      manifestDefinition,
      normalizedContext
    );

  const manifestTarget =
    manager.resolve(
      manifestRelativePath
    );

  /*
   * El manifest se agrega antes de construir
   * su contenido para incluirse a sí mismo
   * dentro del listado final de archivos.
   */
  files.push({
    key:
      'manifest',

    template:
      null,

    category:
      manifestDefinition.category ||
      'metadata',

    relativePath:
      manager.relative(
        manifestTarget
      ),

    absolutePath:
      manifestTarget
  });

  const manifest =
    buildManifest(
      normalizedContext,
      files
    );

  /*
   * El manifest se escribe una sola vez.
   */
  await writer.write(
    manifestTarget,
    `${JSON.stringify(
      manifest,
      null,
      2
    )}\n`
  );

  return {
    moduleDirectory:
      manager.moduleDirectory,

    manifestPath:
      manifestTarget,

    files,

    manifest
  };
}

/**
 * Resuelve las plantillas habilitadas para
 * el perfil actual usando FILE_CATALOG.
 */
function resolveTemplates(context) {
  const configuredFiles =
    getConfiguredFiles(context);

  return Object.entries(
    FILE_CATALOG
  )
    .filter(
      ([key, definition]) =>
        shouldGenerateFile(
          key,
          definition,
          configuredFiles
        )
    )
    .map(
      ([key, definition]) => ({
        key,

        template:
          definition.template,

        category:
          definition.category ||
          'other',

        fileName:
          currentContext =>
            resolveOutputPath(
              definition,
              currentContext
            )
      })
    );
}

/**
 * Obtiene la configuración de archivos
 * desde cualquiera de las estructuras
 * soportadas por el contexto.
 */
function getConfiguredFiles(context) {
  const generationFiles =
    context.generation?.files;

  if (
    generationFiles &&
    typeof generationFiles === 'object'
  ) {
    return generationFiles;
  }

  const profileFiles =
    context.profile?.files;

  if (
    profileFiles &&
    typeof profileFiles === 'object'
  ) {
    return profileFiles;
  }

  return null;
}

/**
 * Determina si una entrada del catálogo
 * debe generarse.
 */
function shouldGenerateFile(
  key,
  definition,
  configuredFiles
) {
  /*
   * El manifest se procesa por separado
   * porque no utiliza una plantilla.
   */
  if (key === 'manifest') {
    return false;
  }

  /*
   * Una entrada sin plantilla no puede ser
   * renderizada por TemplateEngine.
   */
  if (
    !definition ||
    typeof definition.template !==
      'string' ||
    definition.template.trim() === ''
  ) {
    return false;
  }

  /*
   * Cuando el perfil proporciona una
   * configuración explícita, se respeta.
   */
  if (configuredFiles) {
    return configuredFiles[key] === true;
  }

  /*
   * Compatibilidad con el contexto anterior:
   * si no hay configuración de perfil,
   * se generan los archivos genéricos.
   */
  return GENERIC_FILES.includes(key);
}

/**
 * Convierte la ruta de salida declarada
 * en el catálogo a una ruta concreta.
 *
 * Ejemplo:
 *
 * {module}.routes.js
 *
 * se convierte en:
 *
 * ai-business-model-teams.routes.js
 */
function resolveOutputPath(
  definition,
  context
) {
  if (
    !definition ||
    typeof definition.output !==
      'string' ||
    definition.output.trim() === ''
  ) {
    throw new TypeError(
      'La entrada del catálogo requiere una propiedad output válida'
    );
  }

  const moduleName =
    getModuleName(context);

  return definition.output.replace(
    /\{module\}/g,
    moduleName
  );
}

/**
 * Construye el manifest de generación.
 */
function buildManifest(
  context,
  files
) {
  const moduleName =
    getModuleName(context);

  const schema =
    context.database?.schema ||
    context.schema ||
    null;

  const table =
    context.database?.table ||
    context.table ||
    null;

  const routeBase =
    context.api?.basePath ||
    context.names?.routeBase ||
    context.names?.route ||
    null;

  const generatedAt =
    context.forge?.generatedAt ||
    context.generator?.generatedAt ||
    new Date().toISOString();

  const generatorVersion =
    context.generator?.version ||
    context.forge?.generatorVersion ||
    '0.1.0';

  const profileName =
    context.profile?.name ||
    context.generation?.profile ||
    context.forge?.profile ||
    'generic';

  const standard =
    context.standard ||
    context.profile?.standard ||
    context.forge?.standard ||
    null;

  return {
    manifestVersion:
      '1.1',

    contextVersion:
      context.forge?.contextVersion ||
      '1.0.0',

    generator:
      context.generator || {
        name:
          '@sbn/forge',

        version:
          generatorVersion,

        generatedAt
      },

    profile: {
      name:
        profileName,

      standard
    },

    source:
      context.source,

    module: {
      schema,

      table,

      name:
        moduleName,

      routeBase
    },

    api:
      context.api || null,

    security:
      context.security || null,

    capabilities:
      context.capabilities || {},

    permissions:
      context.permissions || {},

    generation: {
      profile:
        profileName,

      files:
        getConfiguredFiles(context) ||
        {}
    },

    files:
      files.map(
        file => ({
          key:
            file.key,

          template:
            file.template,

          category:
            file.category,

          relativePath:
            file.relativePath,

          absolutePath:
            file.absolutePath
        })
      ),

    definition: {
      primaryKey:
        context.primaryKey || null,

      columns:
        Array.isArray(
          context.columns
        )
          ? context.columns.map(
              column => ({
                name:
                  column.name,

                type:
                  column.type,

                nullable:
                  Boolean(
                    column.nullable
                  ),

                primaryKey:
                  Boolean(
                    column.primaryKey
                  ),

                writable:
                  column.writable !==
                  false,

                foreignKey:
                  column.foreignKey ||
                  null
              })
            )
          : [],

      foreignKeys:
        context.foreignKeys || [],

      indexes:
        context.indexes || [],

      constraints:
        context.constraints || []
    },

    metadata: {
      generatedAt,

      generatorVersion
    }
  };
}

/**
 * Agrega propiedades de compatibilidad para
 * las plantillas actuales.
 *
 * Contexto anterior:
 *
 * context.names.moduleName
 * context.names.routeBase
 * context.schema
 * context.table
 * context.generator
 *
 * Contexto nuevo:
 *
 * context.names.module
 * context.names.route
 * context.database.schema
 * context.database.table
 * context.forge
 */
function normalizeTemplateContext(
  context
) {
  const moduleName =
    getModuleName(context);

  const schema =
    context.database?.schema ||
    context.schema;

  const table =
    context.database?.table ||
    context.table;

  const routeBase =
    context.api?.basePath ||
    context.names?.routeBase ||
    context.names?.route ||
    moduleName;

  const generatedAt =
    context.forge?.generatedAt ||
    context.generator?.generatedAt ||
    new Date().toISOString();

  const generatorVersion =
    context.generator?.version ||
    context.forge?.generatorVersion ||
    '0.1.0';

  return {
    ...context,

    schema,

    table,

    generator: {
      name:
        context.generator?.name ||
        '@sbn/forge',

      version:
        generatorVersion,

      generatedAt,

      ...(context.generator || {})
    },

    names: {
      ...(context.names || {}),

      module:
        context.names?.module ||
        moduleName,

      moduleName,

      route:
        context.names?.route ||
        routeBase,

      routeBase
    }
  };
}

/**
 * Obtiene el nombre del módulo desde cualquiera
 * de las versiones soportadas del contexto.
 */
function getModuleName(context) {
  const moduleName =
    context?.names?.moduleName ||
    context?.names?.module;

  if (
    typeof moduleName !==
      'string' ||
    moduleName.trim() === ''
  ) {
    throw new TypeError(
      'ApiGenerator requiere context.names.module o context.names.moduleName'
    );
  }

  return moduleName.trim();
}

/**
 * Validación mínima antes de generar archivos.
 */
function validateContext(context) {
  if (
    !context ||
    typeof context !== 'object'
  ) {
    throw new TypeError(
      'ApiGenerator requiere un contexto válido'
    );
  }

  if (
    !context.names ||
    typeof context.names !== 'object'
  ) {
    throw new TypeError(
      'ApiGenerator requiere context.names'
    );
  }

  getModuleName(context);

  if (
    !Array.isArray(
      context.columns
    )
  ) {
    throw new TypeError(
      'ApiGenerator requiere context.columns'
    );
  }
}

module.exports = {
  generateApi
};