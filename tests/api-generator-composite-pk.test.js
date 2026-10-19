'use strict';

const fs = require('fs-extra');
const os = require('os');
const path = require('path');

const definition = require(
  '../examples/ai_agent_role_assignments.json'
);

const {
  createGeneratorContext
} = require('../src/core/generator-context');

const {
  generateApi
} = require('../src/generators/backend/api-generator');

describe('API Generator - Composite Primary Key', () => {
  test('opt-in JWT protects module routes without changing generic defaults', async () => {
    const output = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-jwt-contract-'));
    try {
      const context = createGeneratorContext(definition);
      context.security = { requireJwt: true };
      const result = await generateApi(context, { output });
      const routes = await fs.readFile(path.join(
        result.moduleDirectory, 'ai-agent-role-assignments.routes.js'
      ), 'utf8');
      expect(routes).toContain("fastify.addHook('onRequest', requireAuth)");
      expect(routes).toContain("await request.jwtVerify()");
      expect(routes).toContain('reply.code(503)');
      const schemas = require(path.join(
        result.moduleDirectory, 'ai-agent-role-assignments.schema.js'
      ));
      expect(schemas.create.body.required).toEqual(['agent_id', 'role_id']);
      expect(schemas.update.body.required).toEqual(['expected_version_no']);
      expect(schemas.getById.params.required).toEqual(['agent_id', 'role_id']);
    } finally {
      await fs.remove(output);
    }
  });
  test('genera CRUD con agent_id y role_id', async () => {
    const output = await fs.mkdtemp(
      path.join(os.tmpdir(), 'forge-composite-pk-')
    );

    try {
      const context = createGeneratorContext(definition);

      expect(context.primaryKeys.map(c => c.name)).toEqual([
        'agent_id',
        'role_id'
      ]);

      const result = await generateApi(context, { output });

      const read = async (suffix) =>
        fs.readFile(
          path.join(
            result.moduleDirectory,
            `ai-agent-role-assignments.${suffix}.js`
          ),
          'utf8'
        );

      const routes = await read('routes');
      const schema = await read('schema');
      const controller = await read('controller');
      const repository = await read('repository');

      expect(routes).toContain(
        '${base}/:agent_id/:role_id'
      );

      expect(schema).toContain(
        "required: ['agent_id', 'role_id']"
      );

      expect(schema).toContain(
        "format: 'uuid'"
      );

      expect(schema).toContain(
        'role_id:'
      );

      expect(controller).toContain(
        'request.params'
      );

      const repositoryModule = require(
        path.join(
          result.moduleDirectory,
          'ai-agent-role-assignments.repository.js'
        )
      );

      let captured;

      repositoryModule.configure({
        async query(sql, values) {
          captured = { sql, values };
          return {
            rows: [{ agent_id: 'test-agent', role_id: 7 }],
            rowCount: 1
          };
        }
      });

      const record = await repositoryModule.getById({
        agent_id: 'test-agent',
        role_id: 7
      });

      expect(record.role_id).toBe(7);

      expect(captured.sql).toContain(
        'agent_id = $1 AND role_id = $2'
      );

      expect(captured.values).toEqual([
        'test-agent',
        7
      ]);
      expect(repository).not.toContain(
        "primaryKey: ''"
      );

    } finally {
      await fs.remove(output);
    }
  });
  test('legacy definition generates UUID filter and qualified conflict SQL', async () => {
    const output = await fs.mkdtemp(
      path.join(os.tmpdir(), 'forge-legacy-filter-')
    );
    try {
      const context = createGeneratorContext(definition);
      const result = await generateApi(context, { output });
      const repositoryModule = require(path.join(
        result.moduleDirectory,
        'ai-agent-role-assignments.repository.js'
      ));
      const calls = [];
      repositoryModule.configure({
        async query(sql, values) {
          calls.push({ sql, values });
          return { rows: [], rowCount: 0 };
        }
      });
      const agentId = '11111111-1111-4111-8111-111111111111';
      await repositoryModule.list({ agent_id: agentId, limit: 7, offset: 2 });
      expect(calls[0].sql).toMatch(/agent_id\s*=\s*\$1/);
      expect(calls[0].sql).toMatch(/LIMIT\s+\$2/);
      expect(calls[0].sql).toMatch(/OFFSET\s+\$3/);
      expect(calls[0].values).toEqual([agentId, 7, 2]);
      await repositoryModule.create({ agent_id: agentId, role_id: 3 });
      expect(calls[1].sql).toContain(
        'version_no = simo_ai.ai_agent_role_assignments.version_no + 1'
      );
      expect(calls[1].sql).toContain(
        'WHERE simo_ai.ai_agent_role_assignments.deleted_at IS NOT NULL'
      );
    } finally {
      await fs.remove(output);
    }
  });

});
