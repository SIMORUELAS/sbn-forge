'use strict';

module.exports = {
  name: 'sbn-api-v2',

  standard: 'SBN API v2',

  files: {

    routes: true,
    controller: true,
    service: true,
    repository: true,
    schema: true,

    readme: true,
    manifest: true,

    apiExamples: true,
    dictionary: true,

    migration: true,
    seeds: true,

    httpTest: true,

    utilsRequired: true,

    postmanCollection: true

  },

  capabilities: {

    crud: true,
    bulk: true,
    reorder: true,
    copy: true,
    validate: true,
    summary: true,
    softDelete: true,
    audit: true,
    optimisticLock: true

  },

  security: {

    jwt: true,
    permissions: true,
    organizationContext: true

  }
};