'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const NAME = /^[a-zA-Z][a-zA-Z0-9_-]{2,39}$/;
const DB = /^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/;
const HOST = /^[a-zA-Z0-9][a-zA-Z0-9.-]{0,252}$/;
function createConnectionProfiles({ env = process.env, file = path.join(os.homedir(), '.sbn-forge-studio', 'connections.enc.json') } = {}) {
  const enabled = env.FORGE_STUDIO_CONNECTION_PROFILES === '1';
  const keyHex = env.FORGE_STUDIO_CONNECTION_KEY || '';
  const key = /^[a-f0-9]{64}$/i.test(keyHex) ? Buffer.from(keyHex, 'hex') : null;
  const allowedHosts = (env.FORGE_STUDIO_ALLOWED_DB_HOSTS || '127.0.0.1,localhost').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  function ready() { if (!enabled || !key) { const e = new Error('CONNECTION_PROFILE_STORAGE_NOT_CONFIGURED'); e.status = 503; throw e; } }
  function validate(value) {
    function invalid(reason) { const error = new Error(reason); error.status = 400; throw error; }
    if (!value || !NAME.test(value.name || '')) { invalid('PROFILE_NAME_INVALID'); }
    if (!HOST.test(value.host || '') ||
        !allowedHosts.includes(value.host.toLowerCase())) { invalid('PROFILE_HOST_NOT_ALLOWED'); }
    if (!Number.isInteger(Number(value.port)) || Number(value.port) < 1 || Number(value.port) > 65535) { invalid('PROFILE_PORT_INVALID'); }
    if (!DB.test(value.database || '')) { invalid('PROFILE_DATABASE_INVALID'); }
    if (!DB.test(value.user || '')) { invalid('PROFILE_USER_INVALID'); }
    if (typeof value.password !== 'string' || !value.password || value.password.length > 512) { invalid('PROFILE_PASSWORD_REQUIRED'); }
    return { name: value.name, host: value.host, port: Number(value.port),
      database: value.database, user: value.user, password: value.password };
  }
  function publicProfile(p) {
    return { name: p.name, host: p.host, port: p.port, database: p.database, user: p.user,
      mode: 'READ_ONLY', passwordConfigured: true };
  }
  async function load() {
    ready();
    let raw;
    try { raw = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') { return []; } throw new Error('CONNECTION_PROFILE_STORE_UNAVAILABLE'); }
    try {
      if (raw.version !== 1 || !Array.isArray(raw.profiles)) { throw new Error(); }
      return raw.profiles.map(item => {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key,
          Buffer.from(item.iv, 'base64'));
        decipher.setAuthTag(Buffer.from(item.tag, 'base64'));
        return validate(JSON.parse(Buffer.concat([
          decipher.update(Buffer.from(item.data, 'base64')), decipher.final()
        ]).toString('utf8')));
      });
    } catch { throw new Error('CONNECTION_PROFILE_DECRYPTION_FAILED'); }
  }
  async function save(profiles) {
    ready();
    const records = profiles.map(p => {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      const data = Buffer.concat([cipher.update(JSON.stringify(p)), cipher.final()]);
      return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'),
        data: data.toString('base64') };
    });
    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    const temp = file + '.' + crypto.randomUUID() + '.tmp';
    try {
      await fs.writeFile(temp, JSON.stringify({ version: 1, profiles: records }), { mode: 0o600, flag: 'wx' });
      await fs.rename(temp, file);
    } finally { await fs.rm(temp, { force: true }).catch(() => {}); }
  }
  async function list() { return (await load()).map(publicProfile); }
  async function get(name) { return (await load()).find(p => p.name === name) || null; }
  async function upsert(value, originalName) {
    ready();
    const profiles = await load();
    const existing = originalName ? profiles.find(p => p.name === originalName) : profiles.find(p => p.name === value?.name);
    if (originalName && !existing) { const e = new Error('PROFILE_NOT_FOUND'); e.status = 404; throw e; }
    const candidate = validate({ ...value, password: value?.password || existing?.password });
    if (originalName && originalName !== candidate.name && profiles.some(p => p.name === candidate.name)) {
      const e = new Error('PROFILE_ALREADY_EXISTS'); e.status = 409; throw e;
    }
    if (!originalName && existing) { const e = new Error('PROFILE_ALREADY_EXISTS'); e.status = 409; throw e; }
    const next = profiles.filter(p => p.name !== (originalName || candidate.name));
    next.push(candidate);
    await save(next);
    return publicProfile(candidate);
  }
  async function remove(name) {
    const profiles = await load();
    if (!profiles.some(p => p.name === name)) { const e = new Error('PROFILE_NOT_FOUND'); e.status = 404; throw e; }
    await save(profiles.filter(p => p.name !== name));
  }
  return { enabled: enabled && Boolean(key), list, get, upsert, remove, validate, publicProfile };
}
module.exports = { createConnectionProfiles };
