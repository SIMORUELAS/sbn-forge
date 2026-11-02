'use strict';
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { generateIsolated } = require('../studio/isolated-generation');
const { prepareArtifactSecurityContracts } = require('../studio/artifact-security-contracts');
const { assessSecurityCertification } = require('../studio/security-certification');

const metadata = { defaultValue: null, identity: false, maxLength: null, precision: null, scale: null };
const definition = {
  version: 1, name: 'security_contract_sample',
  source: { type: 'postgresql', schema: 'product_hub', table: 'security_contract_sample' },
  primaryKey: { name: 'security_contract_sample_pkey', columns: ['id'] }, foreignKeys: [],
  fields: [
    { name: 'id', dataType: 'uuid', nullable: false, visible: true, editable: false, required: false, ...metadata, defaultValue: 'gen_random_uuid()' },
    { name: 'name', dataType: 'text', nullable: false, visible: true, editable: true, required: true, ...metadata }
  ]
};

test('creates local source contract tests for the actual isolated module, without certification', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-artifact-contracts-'));
  try {
    const run = await generateIsolated(definition, { tempRoot: parent });
    expect(run.artifacts).toHaveLength(7);
    const prepared = await prepareArtifactSecurityContracts(run);
    expect(prepared.kind).toBe('source-contract-only');
    expect(prepared.installable).toBe(false);
    expect(prepared.integrationVerified).toBe(false);
    expect(prepared.artifacts).toHaveLength(8);
    const source = await fs.readFile(path.join(run.directory, prepared.path), 'utf8');
    expect(source).toContain('TENANT_SCOPE_REQUIRED');
    expect(source).toContain('request.jwtVerify()');
    const certification = await assessSecurityCertification(run.directory, prepared.artifacts, []);
    expect(certification.installable).toBe(false);
    expect(certification.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    await expect(prepareArtifactSecurityContracts(run)).rejects.toMatchObject({ code: 'EEXIST' });
  } finally {
    await fs.rm(parent, { recursive: true, force: true });
  }
});

test('refuses to prepare security contracts for a non-isolated run', async () => {
  await expect(prepareArtifactSecurityContracts({ mode: 'published' }))
    .rejects.toThrow('ISOLATED_GENERATION_REQUIRED');
});
