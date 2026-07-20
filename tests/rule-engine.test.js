'use strict';

const RuleEngine = require('../src/core/rule-engine');
const { createDefaultRules } = require('../src/rules');

describe('RuleEngine', () => {
  test('detecta capacidades SBN por columnas', () => {
    const context = {
      columns: [
        { name: 'id' },
        { name: 'created_at' },
        { name: 'deleted_at' },
        { name: 'version_no' }
      ],
      capabilities: {}
    };

    const engine = new RuleEngine(createDefaultRules());

    const result = engine.apply(context);

    expect(result.capabilities.audit).toBe(true);
    expect(result.capabilities.softDelete).toBe(true);
    expect(result.capabilities.optimisticLock).toBe(true);
  });

  test('no activa capacidades inexistentes', () => {
    const context = {
      columns: [{ name: 'id' }, { name: 'name' }],
      capabilities: {}
    };

    const engine = new RuleEngine(createDefaultRules());

    const result = engine.apply(context);

    expect(result.capabilities.softDelete).toBeUndefined();
    expect(result.capabilities.optimisticLock).toBeUndefined();
  });
});