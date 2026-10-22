'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { generateIsolated } = require('./isolated-generation');

function createRunManager({ definitionStore, generate = generateIsolated, limit = 10 } = {}) {
  if (!definitionStore) { throw new Error('Se requiere almacén de definiciones'); }
  const runs = new Map();
  let busy = false;
  function summary(run) {
    return { id: run.id, name: run.name, createdAt: run.createdAt, mode: run.mode, totals: run.totals, artifacts: run.artifacts, published: false };
  }
  return {
    async execute(name) {
      if (busy) { const error = new Error('Generación en curso'); error.status = 409; throw error; }
      busy = true;
      try {
        const definition = await definitionStore.get(name);
        const result = await generate(definition);
        const run = { ...result, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        runs.set(run.id, run);
        while (runs.size > limit) {
          const first = runs.keys().next().value;
          const old = runs.get(first);
          runs.delete(first);
          await fs.rm(old.directory, { recursive: true, force: true }).catch(() => {});
        }
        return summary(run);
      } finally { busy = false; }
    },
    list() { return [...runs.values()].reverse().map(summary); },
    async read(id, artifactPath) {
      const run = runs.get(id);
      if (!run) { const error = new Error('Ejecución no encontrada'); error.status = 404; throw error; }
      if (typeof artifactPath !== 'string' || !run.artifacts.some(item => item.path === artifactPath)) {
        const error = new Error('Archivo no autorizado'); error.status = 400; throw error;
      }
      const root = path.resolve(run.directory);
      const full = path.resolve(root, artifactPath);
      if (!full.startsWith(root + path.sep)) { const error = new Error('Ruta inválida'); error.status = 400; throw error; }
      const stat = await fs.lstat(full);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024) {
        const error = new Error('Archivo no disponible para revisión'); error.status = 400; throw error;
      }
      return { path: artifactPath, content: await fs.readFile(full, 'utf8') };
    }
  };
}
module.exports = { createRunManager };
