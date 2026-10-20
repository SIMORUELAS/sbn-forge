'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const definition = require('../examples/ai_agent_role_assignments.json');
const { createGeneratorContext } = require('../src/core/generator-context');
const { generateApi } = require('../src/generators/backend/api-generator');

describe('Forge to SBN API role-assignment compatibility contracts', () => {
  let output;
  let directory;
  let repository;
  let service;
  let routes;
  let schemas;

  beforeAll(async () => {
    output = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-api-contract-'));
    const context = createGeneratorContext(definition);
    context.security = { requireJwt: true };
    context.api = { basePath: '/ia/ai-agent-role-assignments' };
    directory = (await generateApi(context, { output })).moduleDirectory;
    const file = suffix => require(path.join(directory, `ai-agent-role-assignments.${suffix}.js`));
    repository = file('repository');
    service = file('service');
    routes = file('routes');
    schemas = file('schema');
  });

  afterAll(async () => {
    if (output) { await fs.remove(output); }
  });

  test('schemas preserve composite UUID key and optimistic version', () => {
    expect(schemas.getById.params.required).toEqual(['agent_id', 'role_id']);
    expect(schemas.getById.params.properties.agent_id.format).toBe('uuid');
    expect(schemas.getById.params.properties.role_id.type).toBe('integer');
    expect(schemas.getById.params.properties.role_id.minimum).toBe(-32768);
    expect(schemas.getById.params.properties.role_id.maximum).toBe(32767);
    expect(schemas.create.body.properties.role_id.maximum).toBe(32767);
    expect(schemas.create.body.required).toEqual(['agent_id', 'role_id']);
    expect(schemas.update.body.required).toEqual(['expected_version_no']);
    expect(schemas.update.body.properties.expected_version_no.minimum).toBe(1);
  });

  test('service returns 404 for missing records and 409 for stale versions', async () => {
    const key = { agent_id: '11111111-1111-4111-8111-111111111111', role_id: 2 };
    repository.configure({
      async query(sql) {
        if (/^\s*UPDATE\b/i.test(sql)) { return { rows: [], rowCount: 0 }; }
        if (/^\s*SELECT\b/i.test(sql)) { return { rows: [{ ...key, version_no: 3 }], rowCount: 1 }; }
        throw new Error('Unexpected SQL');
      }
    });
    await expect(service.update(key, { expected_version_no: 2 }))
      .rejects.toMatchObject({ statusCode: 409 });
    repository.configure({
      async query() { return { rows: [], rowCount: 0 }; }
    });
    await expect(service.getById(key)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.update(key, { expected_version_no: 2 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('invalid expected_version_no is rejected before database access', async () => {
    const query = jest.fn();
    repository.configure({ query });
    const key = { agent_id: '11111111-1111-4111-8111-111111111111', role_id: 2 };
    for (const version of [0, -1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1, undefined]) {
      await expect(repository.update(key, { expected_version_no: version }))
        .rejects.toMatchObject({ statusCode: 400 });
    }
    expect(query).not.toHaveBeenCalled();
  });

  test('create writes audit origin and update binds composite keys and version', async () => {
    const calls = [];
    const key = { agent_id: '11111111-1111-4111-8111-111111111111', role_id: 2 };
    repository.configure({
      async query(sql, values) {
        calls.push({ sql, values });
        return { rows: [{ ...key, version_no: 3 }], rowCount: 1 };
      }
    });
    await repository.create(key, { userId: 42, source: 'contract-test' });
    expect(calls[0].sql).toMatch(/INSERT INTO simo_ai\.ai_agent_role_assignments/);
    expect(calls[0].sql).toContain('created_by');
    expect(calls[0].sql).toContain('created_from');
    expect(calls[0].values).toContain(42);
    expect(calls[0].values).toContain('contract-test');
    await repository.update(key, { expected_version_no: 2 }, { userId: 42, source: 'contract-test' });
    expect(calls[1].sql).toMatch(/AND version_no = \$\d+/);
    expect(calls[1].sql).toContain('deleted_at IS NULL');
    expect(calls[1].sql).toContain('agent_id =');
    expect(calls[1].sql).toContain('role_id =');
    expect(calls[1].values).toContain(42);
    expect(calls[1].values).toContain('contract-test');
    expect(calls[1].values).toContain(key.agent_id);
    expect(calls[1].values).toContain(key.role_id);
  });

  test('JWT guard rejects missing verification and verifies authenticated requests', async () => {
    const hooks = [];
    const registered = [];
    const fastify = {
      pg: { async query() { return { rows: [], rowCount: 0 }; } },
      addHook(name, hook) { hooks.push({ name, hook }); },
      get(url) { registered.push(['GET', url]); },
      post(url) { registered.push(['POST', url]); },
      patch(url) { registered.push(['PATCH', url]); },
      delete(url) { registered.push(['DELETE', url]); }
    };
    await routes(fastify);
    expect(hooks.map(item => item.name)).toContain('onRequest');
    expect(registered).toContainEqual(['GET', '/ia/ai-agent-role-assignments']);
    expect(registered).toContainEqual(['PATCH', '/ia/ai-agent-role-assignments/:agent_id/:role_id']);
    const hook = hooks.find(item => item.name === 'onRequest').hook;
    const reply = {
      status: null,
      payload: null,
      code(status) { this.status = status; return this; },
      send(payload) { this.payload = payload; return this; }
    };
    await hook({}, reply);
    expect(reply.status).toBe(503);
    expect(reply.payload.message).toMatch(/JWT/);
    const jwtVerify = jest.fn().mockResolvedValue(undefined);
    await hook({ jwtVerify }, reply);
    expect(jwtVerify).toHaveBeenCalledTimes(1);
    await expect(hook({ jwtVerify: jest.fn().mockRejectedValue(new Error('invalid token')) }, reply))
      .rejects.toThrow('invalid token');
  });
});
