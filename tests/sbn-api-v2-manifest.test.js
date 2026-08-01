'use strict';

const fs = require('fs-extra');
const path = require('path');

const definition = require(
  '../examples/ai_business_model_teams.json'
);

const {
  generateTestModule
} = require(
  './helpers/generate-test-module'
);

describe(
  'SBN API v2 Manifest',
  () => {
    test(
      'genera un manifest válido',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile: 'sbn-api-v2'
          });

        try {
          const manifestPath =
            path.join(
              generated.moduleDirectory,
              'sbn-forge.manifest.json'
            );

          expect(
            await fs.pathExists(
              manifestPath
            )
          ).toBe(true);

          const manifest =
            await fs.readJson(
              manifestPath
            );

          expect(
            manifest.manifestVersion
          ).toBe(
            '1.1'
          );

          expect(
            manifest.contextVersion
          ).toBe(
            '1.0.0'
          );

          expect(
            manifest.generator
          ).toMatchObject({
            name: '@sbn/forge',
            version: '0.1.0'
          });

          expect(
            manifest.generator.generatedAt
          ).toEqual(
            expect.any(String)
          );

          expect(
            manifest.profile
          ).toEqual({
            name: 'sbn-api-v2',
            standard: 'SBN API v2'
          });

          expect(
            manifest.source.type
          ).toBe(
            'json'
          );

          expect(
            manifest.module
          ).toEqual({
            schema: 'simo_ai',
            table:
              'ai_business_model_teams',
            name:
              'ai-business-model-teams',
            routeBase:
              '/ia/ai-business-model-teams'
          });

          expect(
            manifest.api
          ).toEqual({
            standard: 'SBN API v2',
            prefix: '/ia',
            basePath:
              '/ia/ai-business-model-teams',
            baseUrl:
              'http://localhost:3500',
            route:
              'ai-business-model-teams'
          });

          expect(
            manifest.security
          ).toEqual({
            jwt: true,
            permissions: true,
            organizationContext: true
          });

          expect(
            manifest.capabilities
          ).toMatchObject({
            crud: true,
            bulk: true,
            bulkCreate: true,
            copy: true,
            validate: true,
            summary: true,
            reorder: true,
            audit: true,
            softDelete: true,
            optimisticLock: true,
            multiTenant: false,
            branchSecurity: false,
            statusManagement: false,
            foreignKeys: true,
            hasPrimaryKey: true
          });

          expect(
            manifest.capabilities
              .auditColumns
          ).toEqual([
            'created_at',
            'created_by',
            'created_from',
            'updated_at',
            'updated_by',
            'updated_from',
            'deleted_at',
            'deleted_by'
          ]);

          expect(
            manifest.capabilities
              .jsonColumns
          ).toEqual([
            'configuration_json'
          ]);

          expect(
            manifest.permissions
          ).toEqual({
            view:
              'AI_BUSINESS_MODEL_TEAMS_VIEW',
            create:
              'AI_BUSINESS_MODEL_TEAMS_CREATE',
            edit:
              'AI_BUSINESS_MODEL_TEAMS_EDIT',
            delete:
              'AI_BUSINESS_MODEL_TEAMS_DELETE',
            reorder:
              'AI_BUSINESS_MODEL_TEAMS_REORDER',
            copy:
              'AI_BUSINESS_MODEL_TEAMS_COPY'
          });

          expect(
            manifest.generation.profile
          ).toBe(
            'sbn-api-v2'
          );

          expect(
            manifest.generation.files
          ).toEqual({
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
            postmanCollection: true,
          });

          const fileKeys =
            manifest.files.map(
              file => file.key
            );

         expect(
            fileKeys
          ).toEqual([
            'routes',
            'controller',
            'service',
            'repository',
            'schema',
            'readme',
            'apiExamples',
            'dictionary',
            'migration',
            'seeds',
            'httpTest',
            'utilsRequired',
            'postmanCollection',
            'manifest'
          ]);
          
          expect(
            manifest.files
          ).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                key: 'migration',
                template:
                  'database/migration.hbs',
                category: 'database',
                relativePath:
                  'modules/ai-business-model-teams/database/migrations/ai-business-model-teams.migration.sql'
              }),

              expect.objectContaining({
                key: 'seeds',
                template:
                  'database/seeds.hbs',
                category: 'database',
                relativePath:
                  'modules/ai-business-model-teams/database/seeds/ai-business-model-teams.seeds.sql'
              }),

              expect.objectContaining({
                key: 'manifest',
                template: null,
                category: 'metadata',
                relativePath:
                  'modules/ai-business-model-teams/sbn-forge.manifest.json'
              })
            ])
          );

          expect(
            manifest.definition.primaryKey
          ).toEqual({
            name: 'id',
            columns: [
              'id'
            ]
          });

          expect(
            manifest.definition.columns
          ).toHaveLength(
            16
          );

          expect(
            manifest.definition
              .foreignKeys
          ).toEqual([
            {
              name: null,
              column:
                'business_model_id',
              referencedSchema:
                'simo_ai',
              referencedTable:
                'ai_business_models',
              referencedColumn:
                'id'
            },
            {
              name: null,
              column:
                'team_id',
              referencedSchema:
                'simo_ai',
              referencedTable:
                'ai_business_teams',
              referencedColumn:
                'id'
            }
          ]);

          expect(
            manifest.definition.indexes
          ).toEqual([]);

          expect(
            manifest.definition.constraints
          ).toEqual([]);

          expect(
            manifest.metadata
              .generatorVersion
          ).toBe(
            '0.1.0'
          );

          expect(
            manifest.metadata.generatedAt
          ).toEqual(
            expect.any(String)
          );
        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);