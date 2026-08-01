'use strict';

const fs =
  require('fs-extra');

const path =
  require('path');

const definition =
  require(
    '../examples/ai_business_models.json'
  );

const {
  generateTestModule
} = require(
  './helpers/generate-test-module'
);

describe(
  'Postman Collection Generator',
  () => {
    test(
      'genera una colección Postman válida',
      async () => {
        const generated =
          await generateTestModule({
            definition,
            profile:
              'sbn-api-v2'
          });

        try {
          const collectionPath =
            path.join(
              generated.moduleDirectory,
              'ai-business-models.postman_collection.json'
            );

          expect(
            await fs.pathExists(
              collectionPath
            )
          ).toBe(true);

          const collection =
            await fs.readJson(
              collectionPath
            );

          expect(
            collection.info
          ).toBeDefined();

          expect(
            collection.info.name
          ).toBe(
            'AiBusinessModels API'
          );

          expect(
            collection.info.schema
          ).toBe(
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
          );

          expect(
            collection.variable
          ).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                key:
                  'baseUrl',

                value:
                  'http://localhost:3500'
              }),

              expect.objectContaining({
                key:
                  'id'
              }),

              expect.objectContaining({
                key:
                  'token'
              })
            ])
          );

          expect(
            collection.item
          ).toHaveLength(
            5
          );

          const requests =
            Object.fromEntries(
              collection.item.map(
                item => [
                  item.name,
                  item.request
                ]
              )
            );

          expect(
            requests.List.method
          ).toBe(
            'GET'
          );

          expect(
            requests['Get By Id'].method
          ).toBe(
            'GET'
          );

          expect(
            requests.Create.method
          ).toBe(
            'POST'
          );

          expect(
            requests.Update.method
          ).toBe(
            'PATCH'
          );

          expect(
            requests.Delete.method
          ).toBe(
            'DELETE'
          );

          expect(
            requests.List.url.raw
          ).toContain(
            '{{baseUrl}}/ia/ai-business-models'
          );

          expect(
            requests['Get By Id'].url.raw
          ).toContain(
            '{{id}}'
          );

          expect(
            requests.Create.body.mode
          ).toBe(
            'raw'
          );

          expect(
            JSON.parse(
              requests.Create.body.raw
            )
          ).toMatchObject({
            code:
              'SBN-EXAMPLE',

            name:
              'Registro de ejemplo'
          });

          expect(
            JSON.parse(
              requests.Update.body.raw
            )
          ).toMatchObject({
            expected_version_no:
              1
          });
        } finally {
          await generated.cleanup();
        }
      }
    );
  }
);