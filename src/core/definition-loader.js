'use strict';
const path = require('path');
const fs = require('fs-extra');
const { validateDefinition } = require('./definition-validator');
async function loadDefinition(file) {
  const absolute = path.resolve(file);
  if (!(await fs.pathExists(absolute))) {throw new Error(`No existe la definición JSON: ${absolute}`);}
  let data;
  try { data = await fs.readJson(absolute); } catch (error) { throw new Error(`JSON inválido en ${absolute}: ${error.message}`); }
  validateDefinition(data);
  return data;
}
module.exports = { loadDefinition };
