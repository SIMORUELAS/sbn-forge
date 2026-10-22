#!/usr/bin/env node
'use strict';
const { createDefinitionStore } = require('./definition-store');
const { generateIsolated } = require('./isolated-generation');

async function main() {
  const name = process.argv[2];
  if (!name || process.argv.length !== 3) {
    throw new Error('Uso: node studio/generate-isolated.js <nombre_definicion>');
  }
  if (process.env.FORGE_STUDIO_ALLOW_ISOLATED_GENERATION !== '1') {
    throw new Error('Generación deshabilitada. Define FORGE_STUDIO_ALLOW_ISOLATED_GENERATION=1 únicamente para ejecución local autorizada.');
  }
  const definition = await createDefinitionStore().get(name);
  const result = await generateIsolated(definition);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}
if (require.main === module) {
  main().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
module.exports = { main };
