'use strict';

const path = require('path');

const {
  resolveProjectPath,
  toKebabCase
} = require('./scaffold-utils');

async function preparePaths(fs, rootDirectory, options) {
  const definitionsDirectory = resolveProjectPath(
    rootDirectory,
    options.definitionsDirectory
  );

  const outputDirectory = resolveProjectPath(
    rootDirectory,
    options.output
  );

  await fs.ensureDir(definitionsDirectory);
  await fs.ensureDir(outputDirectory);

  const moduleName = toKebabCase(options.table);
  const definitionFile = path.join(
    definitionsDirectory,
    `${options.table}.json`
  );
  const moduleDirectory = path.join(
    outputDirectory,
    'modules',
    moduleName
  );
  const manifestFile = path.join(
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

module.exports = {
  preparePaths
};
