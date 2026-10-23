'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

async function diagnoseArtifacts(directory, artifacts) {
  const checks = [];
  const paths = new Set(artifacts.map(item => item.path));
  const manifestPath = artifacts.find(item => item.path.endsWith('/sbn-forge.manifest.json'))?.path;
  for (const item of artifacts) {
    if (!item.path.endsWith('.js')) { continue; }
    try {
      const source = await fs.readFile(path.join(directory, item.path), 'utf8');
      new vm.Script(source, { filename: item.path }); // Parse only; never execute generated code.
      checks.push({ path: item.path, check: 'javascript-syntax', status: 'passed', message: 'Sintaxis JavaScript válida' });
    } catch (error) {
      checks.push({ path: item.path, check: 'javascript-syntax', status: 'failed', message: String(error.message).slice(0, 300) });
    }
  }
  if (!manifestPath) {
    checks.push({ path: '', check: 'manifest', status: 'warning', message: 'No se encontró manifiesto' });
  } else {
    try {
      const manifest = JSON.parse(await fs.readFile(path.join(directory, manifestPath), 'utf8'));
      const declared = (manifest.files || []).map(item => item.relativePath);
      const valid = Array.isArray(manifest.files) && declared.length === paths.size &&
        new Set(declared).size === declared.length && declared.every(item => paths.has(item));
      checks.push({ path: manifestPath, check: 'manifest', status: valid ? 'passed' : 'failed',
        message: valid ? 'Archivos declarados coinciden con los generados' : 'Manifiesto inconsistente' });
    } catch (error) {
      checks.push({ path: manifestPath, check: 'manifest', status: 'failed', message: String(error.message).slice(0, 300) });
    }
  }
  checks.push({ path: '', check: 'installation-readiness', status: 'warning',
    message: 'No se validaron dependencias, autenticación, autorización ni configuración de aplicación host. Instalación y publicación deshabilitadas.' });
  return { status: checks.some(item => item.status === 'failed') ? 'failed' : 'review-required', checks };
}
module.exports = { diagnoseArtifacts };
