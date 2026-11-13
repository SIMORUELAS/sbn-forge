'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Handlebars = require('handlebars');

const source = fs.readFileSync(path.join(__dirname, '../src/templates/backend/controller.hbs'), 'utf8');
const ORG = '123e4567-e89b-42d3-a456-426614174010';
const FORGED = '123e4567-e89b-42d3-a456-426614174011';

function controller() {
  const contexts = [];
  const service = Object.fromEntries(['list', 'getById', 'create', 'update', 'remove'].map(name => [
    name, async (...args) => { contexts.push({ name, context: args[args.length - 1] }); return { ok: true }; }
  ]));
  const compiled = Handlebars.compile(source)({ names: { moduleName: 'records' },
    primaryKeyInfo: { isComposite: false } });
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, require: () => service
  });
  return { controller: module.exports, contexts };
}
function reply() {
  return { statusCode: 200, code(value) { this.statusCode = value; return this; },
    send(value) { this.body = value; return this; } };
}
test.each(['list', 'getById', 'create', 'update', 'remove'])(
  'generated %s forwards trusted Portal context rather than JWT organization', async operation => {
    const { controller: handlers, contexts } = controller();
    const request = {
      user: { id: 7, organization_id: FORGED },
      portalSecurityContext: Object.freeze({ userId: 7, organizationId: ORG, operation }),
      headers: {}, query: {}, params: { id: '1' }, body: { label: 'ok' }
    };
    await handlers[operation](request, reply());
    expect(contexts).toHaveLength(1);
    expect(contexts[0].context.organizationId).toBe(ORG);
    expect(contexts[0].context.userId).toBe(7);
  }
);
test('legacy controller without Portal bridge retains existing JWT organization behavior', async () => {
  const { controller: handlers, contexts } = controller();
  await handlers.list({ user: { id: 7, organization_id: ORG }, headers: {}, query: {} }, reply());
  expect(contexts[0].context.organizationId).toBe(ORG);
});
