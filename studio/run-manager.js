'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { generateIsolated } = require('./isolated-generation');

const DEFAULT_ROOT = path.join(os.homedir(), '.sbn-forge-studio', 'runs');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function httpError(message, status) { const error = new Error(message); error.status = status; return error; }
function inside(root, target) { return target.startsWith(root + path.sep); }
function summary(run) {
  return { id: run.id, name: run.name, createdAt: run.createdAt, mode: run.mode,
    totals: run.totals, artifacts: run.artifacts, published: false, integrity: run.integrity || 'unchecked' };
}

function createRunManager({ definitionStore, generate = generateIsolated, limit = 10, directory = DEFAULT_ROOT } = {}) {
  if (!definitionStore) { throw new Error('Se requiere almacén de definiciones'); }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) { throw new Error('Límite de historial inválido'); }
  const root = path.resolve(directory);
  const runs = new Map();
  let busy = false;
  let ready;
  async function ensureRoot() {
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) { throw new Error('Directorio de ejecuciones inválido'); }
  }
  async function writeRecord(run) {
    const destination = path.join(root, run.id + '.json');
    const temporary = path.join(root, '.' + run.id + '.tmp');
    try {
      await fs.writeFile(temporary, JSON.stringify(run, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      await fs.rename(temporary, destination);
    } finally { await fs.rm(temporary, { force: true }); }
  }
  async function validateRecord(run) {
    if (!run || !UUID.test(run.id || '') || !Array.isArray(run.artifacts) ||
        run.mode !== 'isolated-local' || run.published !== false ||
        !run.directory || typeof run.directory !== 'string') { return false; }
    const runDirectory = path.resolve(root, run.id);
    if (path.resolve(run.directory) !== runDirectory) { return false; }
    const stat = await fs.lstat(runDirectory).catch(() => null);
    if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) { return false; }
    return run.artifacts.every(item => item && typeof item.path === 'string' &&
      inside(runDirectory, path.resolve(runDirectory, item.path)) &&
      Number.isSafeInteger(item.bytes) && item.bytes >= 0);
  }
  async function inspect(run) {
    const folder = path.resolve(root, run.id);
    const folderStat = await fs.lstat(folder).catch(() => null);
    if (!folderStat || !folderStat.isDirectory() || folderStat.isSymbolicLink()) { return 'missing'; }
    for (const item of run.artifacts) {
      const full = path.resolve(folder, item.path);
      if (!inside(folder, full)) { return 'corrupt'; }
      let current = path.dirname(full);
      while (current !== folder) {
        const directoryStat = await fs.lstat(current).catch(() => null);
        if (!directoryStat || !directoryStat.isDirectory() || directoryStat.isSymbolicLink()) { return 'corrupt'; }
        current = path.dirname(current);
      }
      const stat = await fs.lstat(full).catch(() => null);
      if (!stat || !stat.isFile() || stat.isSymbolicLink() || stat.size !== item.bytes) { return 'corrupt'; }
      if (item.sha256) {
        const data = await fs.readFile(full);
        if (crypto.createHash('sha256').update(data).digest('hex') !== item.sha256) { return 'corrupt'; }
      }
    }
    return run.artifacts.every(item => Boolean(item.sha256)) ? 'verified' : 'legacy-unverified';
  }
  async function removeOwned(run) {
    const target = path.resolve(root, run.id);
    if (!UUID.test(run.id) || !inside(root, target)) { throw new Error('Ruta de retención inválida'); }
    const stat = await fs.lstat(target).catch(() => null);
    if (stat && stat.isDirectory() && !stat.isSymbolicLink()) {
      await fs.rm(target, { recursive: true, force: true });
    }
    await fs.rm(path.join(root, run.id + '.json'), { force: true });
  }
  async function trim() {
    while (runs.size > limit) {
      const oldest = runs.keys().next().value;
      const run = runs.get(oldest);
      await removeOwned(run);
      runs.delete(oldest);
    }
  }
  async function initialize() {
    await ensureRoot();
    const names = (await fs.readdir(root)).filter(name => UUID.test(name.slice(0, -5)) && name.endsWith('.json'));
    const recovered = [];
    for (const name of names) {
      try {
        const stat = await fs.lstat(path.join(root, name));
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024) { continue; }
        const run = JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
        if (run.id + '.json' === name && await validateRecord(run)) { recovered.push(run); }
      } catch { /* Ignore invalid or incomplete metadata; never delete unrecognized files. */ }
    }
    recovered.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    for (const run of recovered) { runs.set(run.id, run); }
    await trim();
  }
  function start() { if (!ready) { ready = initialize().catch(error => { ready = null; throw error; }); } return ready; }
  return {
    async execute(name) {
      if (busy) { throw httpError('Generación en curso', 409); }
      busy = true;
      try {
        await start();
        const definition = await definitionStore.get(name);
        const result = await generate(definition, { tempRoot: root });
        const id = crypto.randomUUID();
        const destination = path.join(root, id);
        try {
          const original = path.resolve(result.directory);
          if (!inside(root, original) || original === destination) { throw new Error('Directorio generado fuera del aislamiento'); }
          const stat = await fs.lstat(original);
          if (!stat.isDirectory() || stat.isSymbolicLink()) { throw new Error('Directorio generado inválido'); }
          await fs.rename(original, destination);
          const artifacts = [];
          for (const item of result.artifacts) {
            const full = path.resolve(destination, item.path);
            if (!inside(destination, full)) { throw new Error('Artefacto fuera del aislamiento'); }
            const stat = await fs.lstat(full);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== item.bytes) { throw new Error('Artefacto inconsistente'); }
            const digest = crypto.createHash('sha256').update(await fs.readFile(full)).digest('hex');
            artifacts.push({ ...item, sha256: digest });
          }
          const run = { ...result, artifacts, directory: destination, id, createdAt: new Date().toISOString(), published: false };
          if (!await validateRecord(run)) { throw new Error('Artefactos no válidos'); }
          await writeRecord(run);
          runs.set(id, run);
          await trim();
          return { ...summary(run), integrity: await inspect(run) };
        } catch (error) {
          await fs.rm(destination, { recursive: true, force: true }).catch(() => {});
          throw error;
        }
      } finally { busy = false; }
    },
    async list() {
      await start();
      const output = [];
      for (const run of [...runs.values()].reverse()) {
        output.push({ ...summary(run), integrity: await inspect(run) });
      }
      return output;
    },
    async read(id, artifactPath) {
      await start();
      const run = runs.get(id);
      if (!run) { throw httpError('Ejecución no encontrada', 404); }
      const integrity = await inspect(run);
      if (integrity === 'corrupt' || integrity === 'missing') { throw httpError('Integridad de ejecución inválida', 409); }
      if (typeof artifactPath !== 'string' || !run.artifacts.some(item => item.path === artifactPath)) {
        throw httpError('Archivo no autorizado', 400);
      }
      const full = path.resolve(run.directory, artifactPath);
      if (!inside(run.directory, full)) { throw httpError('Ruta inválida', 400); }
      let current = path.dirname(full);
      while (current !== run.directory) {
        const stat = await fs.lstat(current);
        if (!stat.isDirectory() || stat.isSymbolicLink()) { throw httpError('Directorio no autorizado', 400); }
        current = path.dirname(current);
      }
      const handle = await fs.open(full, 'r');
      try {
        const stat = await handle.stat();
        const lstat = await fs.lstat(full);
        if (!stat.isFile() || !lstat.isFile() || lstat.isSymbolicLink() ||
            stat.size > 256 * 1024 || stat.size !== lstat.size) {
          throw httpError('Archivo no disponible para revisión', 400);
        }
        const data = await handle.readFile();
        const item = run.artifacts.find(entry => entry.path === artifactPath);
        if (data.length !== item.bytes ||
            (item.sha256 && crypto.createHash('sha256').update(data).digest('hex') !== item.sha256)) {
          throw httpError('Archivo modificado', 409);
        }
        return { path: artifactPath, content: data.toString('utf8') };
      } finally { await handle.close(); }
    }
  };
}
module.exports = { createRunManager };
