'use strict';

const AuditRule = require('./audit.rule');
const SoftDeleteRule = require('./soft-delete.rule');
const VersioningRule = require('./versioning.rule');

function createDefaultRules() {
  return [
    new AuditRule(),
    new SoftDeleteRule(),
    new VersioningRule()
  ];
}

module.exports = {
  AuditRule,
  SoftDeleteRule,
  VersioningRule,
  createDefaultRules
};