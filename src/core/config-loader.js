'use strict';
const path = require('path');
const fs = require('fs-extra');
const DEFAULTS = { version: '0.1.0', defaultSchema: 'public', defaultOutput: './output', templatesDirectory: './src/templates', overwrite: false, lineEnding: 'lf' };
async function loadConfig(cwd = process.cwd()) {
  const file = path.join(cwd, '.sbnforge.json');
  if (!(await fs.pathExists(file))) {return { ...DEFAULTS };}
  let parsed;
  try { parsed = await fs.readJson(file); } catch (error) { throw new Error(`Configuración inválida en ${file}: ${error.message}`); }
  return { ...DEFAULTS, ...parsed };
}
module.exports = { loadConfig, DEFAULTS };
