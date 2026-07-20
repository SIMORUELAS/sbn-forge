'use strict';
const { camelCase, pascalCase, paramCase, constantCase } = require('change-case');
function singularize(value) { return value.endsWith('ies') ? `${value.slice(0,-3)}y` : value.endsWith('ses') ? value.slice(0,-2) : value.endsWith('s') ? value.slice(0,-1) : value; }
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
module.exports = { buildNames, singularize };
