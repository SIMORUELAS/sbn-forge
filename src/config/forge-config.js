'use strict';

const path = require('path');
const fs = require('fs-extra');

const DEFAULT_FORGE_CONFIG = Object.freeze({
  framework:
    'fastify',

  moduleRoot:
    'modules',

  apiPrefix:
    '/api',

  routePrefix:
    '/ia'
});

function normalizePathSegment(
  value,
  fallback
) {
  const normalized =
    String(
      value || fallback
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
        /\/+$/,
        ''
      );

  return normalized || fallback;
}

function normalizeUrlPrefix(
  value,
  fallback
) {
  const normalized =
    String(
      value || fallback
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
    normalized.startsWith('/')
      ? normalized
      : `/${normalized}`;

  return withLeadingSlash.replace(
    /\/+$/,
    ''
  );
}

function normalizeFramework(
  value
) {
  const framework =
    String(
      value ||
      DEFAULT_FORGE_CONFIG.framework
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

function normalizeForgeConfig(
  configuration = {}
) {
  return {
    framework:
      normalizeFramework(
        configuration.framework
      ),

    moduleRoot:
      normalizePathSegment(
        configuration.moduleRoot,
        DEFAULT_FORGE_CONFIG.moduleRoot
      ),

    apiPrefix:
      normalizeUrlPrefix(
        configuration.apiPrefix,
        DEFAULT_FORGE_CONFIG.apiPrefix
      ),

    routePrefix:
      normalizeUrlPrefix(
        configuration.routePrefix,
        DEFAULT_FORGE_CONFIG.routePrefix
      )
  };
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
  catch (error) {
    throw new Error(
      `No fue posible leer ${resolvedConfigFile}: ` +
      `${error.message}`
    );
  }

  return {
    ...normalizeForgeConfig({
      ...DEFAULT_FORGE_CONFIG,
      ...fileConfiguration
    }),

    configFile:
      resolvedConfigFile,

    configFileFound:
      true
  };
}

function mergeForgeConfiguration({
  defaults = DEFAULT_FORGE_CONFIG,
  fileConfig = {},
  cliOptions = {}
} = {}) {
  const configuration = {
    ...defaults,
    ...fileConfig
  };

  if (
    cliOptions.framework !==
    undefined
  ) {
    configuration.framework =
      cliOptions.framework;
  }

  if (
    cliOptions.moduleRoot !==
    undefined
  ) {
    configuration.moduleRoot =
      cliOptions.moduleRoot;
  }

  if (
    cliOptions.apiPrefix !==
    undefined
  ) {
    configuration.apiPrefix =
      cliOptions.apiPrefix;
  }

  if (
    cliOptions.routePrefix !==
    undefined
  ) {
    configuration.routePrefix =
      cliOptions.routePrefix;
  }

  return normalizeForgeConfig(
    configuration
  );
}

module.exports = {
  DEFAULT_FORGE_CONFIG,
  loadForgeConfig,
  mergeForgeConfiguration,
  normalizeForgeConfig
};