'use strict';

const path =
  require(
    'path'
  );

const fs =
  require(
    'fs-extra'
  );

const DEFAULT_FORGE_CONFIG =
  Object.freeze({
    source:
      Object.freeze({
        provider:
          'postgresql',

        schema:
          'public',

        host:
          'localhost',

        port:
          5432,

        database:
          null,

        user:
          'postgres'
      }),

    project:
      Object.freeze({
        framework:
          'fastify',

        moduleRoot:
          'modules',

        apiPrefix:
          '/api',

        routePrefix:
          '/ia'
      }),

    generation:
      Object.freeze({
        profile:
          'sbn-api-v2',

        definitionsDirectory:
          './examples',

        output:
          './output'
      })
  });

function normalizePathSegment(
  value,
  fallback
) {
  const normalized =
    String(
      value ??
      fallback
    )
      .trim()
      .replace(
        /\\/g,
        '/'
      )
      .replace(
        /^\.?\//,
        ''
      )
      .replace(
        /\/+/g,
        '/'
      )
      .replace(
        /\/+$/g,
        ''
      );

  return normalized ||
    fallback;
}

function normalizeUrlPrefix(
  value,
  fallback
) {
  const normalized =
    String(
      value ??
      fallback
    )
      .trim()
      .replace(
        /\\/g,
        '/'
      )
      .replace(
        /\/+/g,
        '/'
      );

  if (
    normalized === '' ||
    normalized === '/'
  ) {
    return fallback;
  }

  const withLeadingSlash =
    normalized.startsWith(
      '/'
    )
      ? normalized
      : `/${normalized}`;

  return withLeadingSlash.replace(
    /\/+$/g,
    ''
  );
}

function normalizeFramework(
  value
) {
  const framework =
    String(
      value ??
      DEFAULT_FORGE_CONFIG
        .project
        .framework
    )
      .trim()
      .toLowerCase();

  const supportedFrameworks =
    new Set([
      'fastify'
    ]);

  if (
    !supportedFrameworks.has(
      framework
    )
  ) {
    throw new Error(
      `Framework no soportado: ${framework}. ` +
      'Actualmente Forge admite: fastify.'
    );
  }

  return framework;
}

function normalizeSourceConfig(
  source = {}
) {
  const provider =
    String(
      source.provider ??
      DEFAULT_FORGE_CONFIG
        .source
        .provider
    )
      .trim()
      .toLowerCase();

  if (
    provider !==
    'postgresql'
  ) {
    throw new Error(
      `Proveedor no soportado: ${provider}. ` +
      'Actualmente Forge admite: postgresql.'
    );
  }

  const port =
    Number(
      source.port ??
      DEFAULT_FORGE_CONFIG
        .source
        .port
    );

  if (
    !Number.isInteger(
      port
    ) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      'El puerto PostgreSQL configurado no es válido.'
    );
  }

  const databaseValue =
    source.database;

  const database =
    databaseValue ===
      undefined ||
    databaseValue ===
      null ||
    String(
      databaseValue
    ).trim() === ''
      ? null
      : String(
          databaseValue
        ).trim();

  return {
    provider,

    schema:
      String(
        source.schema ??
        DEFAULT_FORGE_CONFIG
          .source
          .schema
      )
        .trim(),

    host:
      String(
        source.host ??
        DEFAULT_FORGE_CONFIG
          .source
          .host
      )
        .trim(),

    port,

    database,

    user:
      String(
        source.user ??
        DEFAULT_FORGE_CONFIG
          .source
          .user
      )
        .trim()
  };
}

function normalizeProjectConfig(
  project = {}
) {
  return {
    framework:
      normalizeFramework(
        project.framework
      ),

    moduleRoot:
      normalizePathSegment(
        project.moduleRoot,
        DEFAULT_FORGE_CONFIG
          .project
          .moduleRoot
      ),

    apiPrefix:
      normalizeUrlPrefix(
        project.apiPrefix,
        DEFAULT_FORGE_CONFIG
          .project
          .apiPrefix
      ),

    routePrefix:
      normalizeUrlPrefix(
        project.routePrefix,
        DEFAULT_FORGE_CONFIG
          .project
          .routePrefix
      )
  };
}

function normalizeGenerationConfig(
  generation = {}
) {
  const profile =
    String(
      generation.profile ??
      DEFAULT_FORGE_CONFIG
        .generation
        .profile
    )
      .trim();

  const definitionsDirectory =
    String(
      generation
        .definitionsDirectory ??
      DEFAULT_FORGE_CONFIG
        .generation
        .definitionsDirectory
    )
      .trim();

  const output =
    String(
      generation.output ??
      DEFAULT_FORGE_CONFIG
        .generation
        .output
    )
      .trim();

  if (
    profile === ''
  ) {
    throw new Error(
      'El perfil de generación no puede estar vacío.'
    );
  }

  if (
    definitionsDirectory === ''
  ) {
    throw new Error(
      'El directorio de definiciones no puede estar vacío.'
    );
  }

  if (
    output === ''
  ) {
    throw new Error(
      'El directorio de salida no puede estar vacío.'
    );
  }

  return {
    profile,

    definitionsDirectory,

    output
  };
}

function migrateLegacyConfig(
  configuration = {}
) {
  const hasLegacyProjectConfig =
    configuration.framework !==
      undefined ||
    configuration.moduleRoot !==
      undefined ||
    configuration.apiPrefix !==
      undefined ||
    configuration.routePrefix !==
      undefined;

  if (
    !hasLegacyProjectConfig
  ) {
    return configuration;
  }

  return {
    ...configuration,

    project: {
      ...(configuration.project ||
        {}),

      framework:
        configuration.project
          ?.framework ??
        configuration.framework,

      moduleRoot:
        configuration.project
          ?.moduleRoot ??
        configuration.moduleRoot,

      apiPrefix:
        configuration.project
          ?.apiPrefix ??
        configuration.apiPrefix,

      routePrefix:
        configuration.project
          ?.routePrefix ??
        configuration.routePrefix
    }
  };
}

function normalizeForgeConfig(
  configuration = {}
) {
  const migratedConfiguration =
    migrateLegacyConfig(
      configuration
    );

  return {
    source:
      normalizeSourceConfig(
        migratedConfiguration.source
      ),

    project:
      normalizeProjectConfig(
        migratedConfiguration.project
      ),

    generation:
      normalizeGenerationConfig(
        migratedConfiguration
          .generation
      )
  };
}

function mergeSection(
  defaults,
  values
) {
  return {
    ...defaults,
    ...(values ||
      {})
  };
}

function applyDefinedOverrides(
  target,
  overrides
) {
  for (
    const [
      key,
      value
    ] of Object.entries(
      overrides
    )
  ) {
    if (
      value !==
      undefined
    ) {
      target[key] =
        value;
    }
  }
}

async function loadForgeConfig({
  rootDirectory,
  configFile
} = {}) {
  const resolvedRootDirectory =
    path.resolve(
      rootDirectory ||
      process.cwd()
    );

  const resolvedConfigFile =
    path.resolve(
      resolvedRootDirectory,
      configFile ||
      'forge.config.json'
    );

  if (
    !await fs.pathExists(
      resolvedConfigFile
    )
  ) {
    return {
      ...normalizeForgeConfig(
        DEFAULT_FORGE_CONFIG
      ),

      configFile:
        resolvedConfigFile,

      configFileFound:
        false
    };
  }

  let fileConfiguration;

  try {
    fileConfiguration =
      await fs.readJson(
        resolvedConfigFile
      );
  }
  catch (
    error
  ) {
    throw new Error(
      `No fue posible leer ${resolvedConfigFile}: ` +
      `${error.message}`
    );
  }

  const migratedFileConfiguration =
    migrateLegacyConfig(
      fileConfiguration
    );

  const mergedConfiguration = {
    source:
      mergeSection(
        DEFAULT_FORGE_CONFIG
          .source,
        migratedFileConfiguration
          .source
      ),

    project:
      mergeSection(
        DEFAULT_FORGE_CONFIG
          .project,
        migratedFileConfiguration
          .project
      ),

    generation:
      mergeSection(
        DEFAULT_FORGE_CONFIG
          .generation,
        migratedFileConfiguration
          .generation
      )
  };

  return {
    ...normalizeForgeConfig(
      mergedConfiguration
    ),

    configFile:
      resolvedConfigFile,

    configFileFound:
      true
  };
}

function mergeForgeConfiguration({
  defaults =
    DEFAULT_FORGE_CONFIG,

  fileConfig = {},

  cliOptions = {}
} = {}) {
  const normalizedDefaults =
    normalizeForgeConfig(
      defaults
    );

  const migratedFileConfig =
    migrateLegacyConfig(
      fileConfig
    );

  const configuration = {
    source:
      mergeSection(
        normalizedDefaults.source,
        migratedFileConfig.source
      ),

    project:
      mergeSection(
        normalizedDefaults.project,
        migratedFileConfig.project
      ),

    generation:
      mergeSection(
        normalizedDefaults
          .generation,
        migratedFileConfig
          .generation
      )
  };

  applyDefinedOverrides(
    configuration.source,
    {
      provider:
        cliOptions.provider,

      schema:
        cliOptions.schema,

      host:
        cliOptions.host,

      port:
        cliOptions.port,

      database:
        cliOptions.database,

      user:
        cliOptions.user
    }
  );

  applyDefinedOverrides(
    configuration.project,
    {
      framework:
        cliOptions.framework,

      moduleRoot:
        cliOptions.moduleRoot,

      apiPrefix:
        cliOptions.apiPrefix,

      routePrefix:
        cliOptions.routePrefix
    }
  );

  applyDefinedOverrides(
    configuration.generation,
    {
      profile:
        cliOptions.profile,

      definitionsDirectory:
        cliOptions
          .definitionsDirectory,

      output:
        cliOptions.output
    }
  );

  return normalizeForgeConfig(
    configuration
  );
}

module.exports = {
  DEFAULT_FORGE_CONFIG,
  loadForgeConfig,
  mergeForgeConfiguration,
  migrateLegacyConfig,
  normalizeForgeConfig,
  normalizeGenerationConfig,
  normalizeProjectConfig,
  normalizeSourceConfig
};