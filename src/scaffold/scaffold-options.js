'use strict';

const {
  normalizeOptionalString,
  normalizeRequiredString
} = require('./scaffold-utils');

function normalizeOptions(options = {}) {
  return {
    table: normalizeRequiredString(options.table),
    schema: normalizeOptionalString(options.schema, 'public'),
    host: normalizeOptionalString(options.host, 'localhost'),
    port: Number(options.port || 5432),
    database: normalizeRequiredString(options.database),
    user: normalizeOptionalString(options.user, 'postgres'),
    password: normalizeOptionalString(
      options.password || process.env.SBN_POSTGRES_PASSWORD,
      ''
    ),
    profile: normalizeOptionalString(options.profile, 'sbn-api-v2'),
    definitionsDirectory: normalizeOptionalString(
      options.definitionsDirectory,
      './examples'
    ),
    output: normalizeOptionalString(options.output, './output'),
    force: options.force === true,
    runTests: options.runTests === true,
    runLint: options.runLint === true,
    quiet: options.quiet === true,
    configFile:
      options.configFile ||
      'forge.config.json',

    framework:
      options.framework,

    moduleRoot:
      options.moduleRoot,

    apiPrefix:
      options.apiPrefix,

    routePrefix:
      options.routePrefix,


  };
}

function validateOptions(options) {
  if (!options.table) {
    throw new TypeError('Debe indicar el nombre de la tabla.');
  }

  if (!options.database) {
    throw new TypeError('Debe indicar la base de datos PostgreSQL.');
  }

  if (!options.password) {
    throw new TypeError(
      'Debe indicar la contraseña PostgreSQL mediante --password ' +
      'o la variable SBN_POSTGRES_PASSWORD.'
    );
  }

  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new TypeError(
      'El puerto PostgreSQL debe estar entre 1 y 65535.'
    );
  }

  if (
    !configuration.framework
  ) {
    throw new Error(
      'Debe especificarse framework.'
    );
  }

  if (
    !configuration.moduleRoot
  ) {
    throw new Error(
      'Debe especificarse moduleRoot.'
    );
  }

  if (
    !configuration.apiPrefix
  ) {
    throw new Error(
      'Debe especificarse apiPrefix.'
    );
  }

  if (
    !configuration.routePrefix
  ) {
    throw new Error(
      'Debe especificarse routePrefix.'
    );
  }

}

module.exports = {
  normalizeOptions,
  validateOptions
};
