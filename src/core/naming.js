'use strict';

const {
  camelCase,
  pascalCase,
  paramCase,
  constantCase
} = require('change-case');

function singularize(value) {
  if (value.endsWith('ies')) {
    return `${value.slice(0, -3)}y`;
  }

  if (value.endsWith('ses')) {
    return value.slice(0, -2);
  }

  if (value.endsWith('s')) {
    return value.slice(0, -1);
  }

  return value;
}

function buildNames(table) {
  const singularTable = singularize(table);

  return {
    table,

    tableSingular: singularTable,

    moduleName: paramCase(table),

    variablePlural: camelCase(table),

    variableSingular: camelCase(singularTable),

    entityPlural: pascalCase(table),

    entitySingular: pascalCase(singularTable),

    permissionPrefix: constantCase(table),

    routeBase: `/${paramCase(table)}`
  };
}

module.exports = {
  buildNames,
  singularize
};