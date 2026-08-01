

'use strict';



module.exports = {
  routes: {
    template: 'backend/routes.hbs',
    output: '{module}.routes.js',
    category: 'backend'
  },

  controller: {
    template: 'backend/controller.hbs',
    output: '{module}.controller.js',
    category: 'backend'
  },

  service: {
    template: 'backend/service.hbs',
    output: '{module}.service.js',
    category: 'backend'
  },

  repository: {
    template: 'backend/repository.hbs',
    output: '{module}.repository.js',
    category: 'backend'
  },

  schema: {
    template: 'backend/schema.hbs',
    output: '{module}.schema.js',
    category: 'backend'
  },

  readme: {
    template: 'backend/readme.hbs',
    output: 'README.md',
    category: 'documentation'
  },

  apiExamples: {
    template: 'documentation/api-examples.hbs',
    output: 'API_EXAMPLES.md',
    category: 'documentation'
  },

  dictionary: {
    template: 'documentation/dictionary.hbs',
    output: 'DATA_DICTIONARY.md',
    category: 'documentation'
  },

  migration: {
    template: 'database/migration.hbs',
    output: 'database/migrations/{module}.migration.sql',
    category: 'database'
  },

  seeds: {
    template: 'database/seeds.hbs',
    output: 'database/seeds/{module}.seeds.sql',
    category: 'database'
  },

  httpTest: {
    template: 'tests/http-test.hbs',
    output: 'tests/{module}.http',
    category: 'tests'
  },

  utilsRequired: {
    template: 'documentation/utils-required.hbs',
    output: 'UTILS_REQUIRED.md',
    category: 'documentation'
  },

  manifest: {
    template: null,
    output: 'sbn-forge.manifest.json',
    category: 'metadata'
  },

  postmanCollection: {
    template:
        'documentation/postman-collection.hbs',

    output:
        '{module}.postman_collection.json'
  }



};