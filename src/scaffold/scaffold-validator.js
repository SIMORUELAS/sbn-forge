'use strict';

async function readAndValidateDefinition(fs, definitionFile) {
  let definition;

  try {
    definition = await fs.readJson(definitionFile);
  }
  catch (error) {
    throw new Error(
      `La definición no contiene JSON válido: ${definitionFile}. ` +
      error.message
    );
  }

  if (!definition || typeof definition !== 'object') {
    throw new TypeError('La definición generada debe ser un objeto.');
  }

  if (
    typeof definition.schema !== 'string' ||
    definition.schema.trim() === ''
  ) {
    throw new TypeError('La definición generada no contiene schema.');
  }

  if (
    typeof definition.table !== 'string' ||
    definition.table.trim() === ''
  ) {
    throw new TypeError('La definición generada no contiene table.');
  }

  if (!Array.isArray(definition.columns) || definition.columns.length === 0) {
    throw new TypeError('La definición generada no contiene columnas.');
  }

  return definition;
}

function validateSeeds(definition) {
  if (!Array.isArray(definition.seeds) || definition.seeds.length === 0) {
    return;
  }

  const placeholderPattern =
    /^(REEMPLAZAR_|TODO_|CHANGE_ME|PLACEHOLDER)/i;
  const findings = [];

  const inspectValue = (value, propertyPath) => {
    if (
      typeof value === 'string' &&
      placeholderPattern.test(value.trim())
    ) {
      findings.push({
        path: propertyPath,
        value
      });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        inspectValue(item, `${propertyPath}[${index}]`);
      });
      return;
    }

    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        inspectValue(
          item,
          propertyPath ? `${propertyPath}.${key}` : key
        );
      });
    }
  };

  definition.seeds.forEach((seed, index) => {
    inspectValue(seed, `seeds[${index}]`);
  });

  if (findings.length === 0) {
    return;
  }

  const details = findings
    .map(finding => `- ${finding.path}: ${finding.value}`)
    .join('\n');

  throw new Error([
    'La definición contiene valores provisionales en seeds.',
    'Reemplace los valores antes de generar:',
    details
  ].join('\n'));
}

async function ensureFileExists(fs, file, message) {
  if (!await fs.pathExists(file)) {
    throw new Error(`${message}: ${file}`);
  }

  const stat = await fs.stat(file);
  if (!stat.isFile()) {
    throw new Error(`${message}: ${file}`);
  }
}

async function ensureDirectoryExists(fs, directory, message) {
  if (!await fs.pathExists(directory)) {
    throw new Error(`${message}: ${directory}`);
  }

  const stat = await fs.stat(directory);
  if (!stat.isDirectory()) {
    throw new Error(`${message}: ${directory}`);
  }
}

module.exports = {
  ensureDirectoryExists,
  ensureFileExists,
  readAndValidateDefinition,
  validateSeeds
};
