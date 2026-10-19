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
    if (output) await fs.remove(output);
  });

  test('schemas preserve composite UUID key and optimistic version', () => {
    expect(schemas.getById.params.required).toEqual(['agent_id', 'role_id']);
    expect(schemas.getById.params.properties.agent_id.format).toBe('uuid');
    expect(schemas.getById.params.properties.role_id.type).toBe('integer');
    expect(schemas.create.body.required).toEqual(['agent_id', 'role_id']);
    expect(schemas.update.body.required).toEqual(['expected_version_no']);
    expect(schemas.update.body.properties.expected_version_no.minimum).toBe(1);
  });

  test('service returns 404 for missing records and 409 for stale versions', async () => {
    const key = { agent_id: '11111111-1111-4111-8111-111111111111', role_id: 2 };
    repository.configure({
      async query(sql) {
        if (/^\s*UPDATE\b/i.test(sql)) return { rows: [], rowCount: 0 };
        if (/^\s*SELECT\b/i.test(sql)) return { rows: [{ ...key, version_no: 3 }], rowCount: 1 };
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
