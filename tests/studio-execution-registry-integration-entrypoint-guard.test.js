'use strict';
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname,
  'studio-postgres-execution-registry.integration.test.js'), 'utf8');

test('direct integration suite requires explicit operator approval before schema DDL', () => {
  const approval = source.indexOf("SBN_FORGE_EXECUTION_REGISTRY_RUN_APPROVED !== '1'");
  const schema = source.indexOf('await pool.query(SCHEMA_SQL)');
  expect(approval).toBeGreaterThan(-1);
  expect(schema).toBeGreaterThan(approval);
});

test('direct integration suite repeats full read-only authorization and privilege preflight', () => {
  const check = source.indexOf('await inspectExecutionRegistryTestEnvironment()');
  const schema = source.indexOf('await pool.query(SCHEMA_SQL)');
  expect(check).toBeGreaterThan(-1);
  expect(schema).toBeGreaterThan(check);
});
