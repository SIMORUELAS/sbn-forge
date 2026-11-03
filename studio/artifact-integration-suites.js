'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

async function inspectArtifactIntegrationTargets(run) {
  if (!run || run.mode !== 'isolated-local' || run.published !== false ||
      run.databaseModified !== false || !Array.isArray(run.artifacts)) {
    throw new Error('ISOLATED_GENERATION_REQUIRED');
  }
  const root = await fs.realpath(run.directory);
  const targets = {};
  for (const [name, suffix] of Object.entries({ repository: '.repository.js', routes: '.routes.js' })) {
    const matching = run.artifacts.filter(item => typeof item.path === 'string' && item.path.endsWith(suffix));
    if (matching.length !== 1) throw new Error('GENERATED_ARTIFACT_REQUIRED: ' + suffix);
    const relative = matching[0].path;
    const absolute = path.resolve(root, relative);
    if (!absolute.startsWith(root + path.sep)) throw new Error('INVALID_GENERATED_ARTIFACT_PATH');
    const stat = await fs.lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('INVALID_GENERATED_ARTIFACT');
    if (!(await fs.realpath(absolute)).startsWith(root + path.sep)) throw new Error('INVALID_GENERATED_ARTIFACT');
    targets[name] = relative;
  }
  if (path.dirname(targets.repository) !== path.dirname(targets.routes)) {
    throw new Error('ARTIFACT_MODULE_MISMATCH');
  }
  return { root, targets, folder: path.dirname(targets.repository) };
}

module.exports = { inspectArtifactIntegrationTargets };
