'use strict';

module.exports = {
  name: 'generic',

  standard: 'Generic API',

  files: {
    routes: true,
    controller: true,
    service: true,
    repository: true,
    schema: true,
    readme: true,
    manifest: true,

    apiExamples: false,
    dictionary: false,
    migration: false,
    seeds: false,
    httpTest: false,
    utilsRequired: false
  },

  capabilities: {
    crud: true,
    bulk: false,
    reorder: false,
    copy: false,
    validate: false,
    summary: false,
    softDelete: false,
    audit: false,
    optimisticLock: false
  }
};