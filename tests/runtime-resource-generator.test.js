'use strict';

const RuntimeResourceGenerator =
  require(
    '../src/generators/runtime/runtime-resource.generator'
  );

describe(
  'RuntimeResourceGenerator',
  () => {
    test(
      'renders a ForgeRuntime ResourceDefinition',
      async () => {
        const generator =
          new RuntimeResourceGenerator();

        const runtimeContext = {
          name:
            'ai-intelligent-departments',

          code:
            'AI_INTELLIGENT_DEPARTMENTS',

          label:
            'Ai Intelligent Departments',

          primaryKey:
            'id',

          api: {
            list: {
              path:
                '/ia/ai-intelligent-departments',

              method:
                'GET'
            },

            getById: {
              path:
                '/ia/ai-intelligent-departments/:id',

              method:
                'GET'
            }
          },

          fields: [
            {
              name:
                'id',

              label:
                'Id',

              type:
                'uuid',

              readonly:
                true
            },

            {
              name:
                'code',

              label:
                'Code',

              type:
                'text',

              required:
                true
            }
          ],

          views: [
            {
              type:
                'list'
            },

            {
              type:
                'detail'
            }
          ],

          defaultTheme:
            'sbn-futuristic'
        };

        const content =
          await generator.render(
            runtimeContext
          );

        expect(content).toContain(
          'export const aiIntelligentDepartmentsResource'
        );

        expect(content).toContain(
          'ResourceDefinition'
        );

        expect(content).toContain(
          'name: "ai-intelligent-departments"'
        );

        expect(content).toContain(
          'primaryKey: "id"'
        );

        expect(content).toContain(
          'path: "/ia/ai-intelligent-departments"'
        );

        expect(content).toContain(
          'name: "code"'
        );

        expect(content).toContain(
          'required: true'
        );

        expect(content).toContain(
          'defaultTheme: "sbn-futuristic"'
        );
      }
    );
  }
);

describe(
  'RuntimeResourceGenerator advanced metadata',
  () => {
    test(
      'renders CRUD, lookup and optimistic locking metadata',
      async () => {
        const generator =
          new RuntimeResourceGenerator();

        const runtimeContext = {
          name:
            'ai-business-model-departments',

          code:
            'AI_BUSINESS_MODEL_DEPARTMENTS',

          label:
            'Ai Business Model Departments',

          primaryKey:
            'id',

          optimisticLock: {
            versionField:
              'version_no',

            expectedField:
              'expected_version_no'
          },

          api: {
            list: {
              path:
                '/ia/ai-business-model-departments',

              method:
                'GET'
            },

            getById: {
              path:
                '/ia/ai-business-model-departments/:id',

              method:
                'GET'
            },

            create: {
              path:
                '/ia/ai-business-model-departments',

              method:
                'POST'
            },

            update: {
              path:
                '/ia/ai-business-model-departments/:id',

              method:
                'PUT'
            },

            delete: {
              path:
                '/ia/ai-business-model-departments/:id',

              method:
                'DELETE'
            }
          },

          fields: [
            {
              name:
                'department_id',

              label:
                'Department Id',

              type:
                'lookup',

              required:
                true,

              lookupResource:
                'ai-intelligent-departments'
            },

            {
              name:
                'version_no',

              label:
                'Version No',

              type:
                'number',

              readonly:
                true,

              defaultValue:
                1
            }
          ],

          views: [
            {
              type:
                'list'
            },

            {
              type:
                'form'
            },

            {
              type:
                'detail'
            }
          ],

          defaultTheme:
            'sbn-futuristic'
        };

        const content =
          await generator.render(
            runtimeContext
          );

        expect(content).toContain(
          'optimisticLock:'
        );

        expect(content).toContain(
          'versionField: "version_no"'
        );

        expect(content).toContain(
          'expectedField: "expected_version_no"'
        );

        expect(content).toContain(
          'method: "POST"'
        );

        expect(content).toContain(
          'method: "PUT"'
        );

        expect(content).toContain(
          'method: "DELETE"'
        );

        expect(content).toContain(
          'type: "lookup"'
        );

        expect(content).toContain(
          'lookupResource: "ai-intelligent-departments"'
        );

        expect(content).toContain(
          'defaultValue: 1'
        );

        expect(content).toContain(
          'type: "form"'
        );
      }
    );
  }
);

describe(
  'Runtime Resource integration',
  () => {
    test(
      'builds and renders a ResourceDefinition from GeneratorContext',
      async () => {
        const RuntimeResourceContextBuilder =
          require(
            '../src/runtime/runtime-resource-context.builder'
          );

        const builder =
          new RuntimeResourceContextBuilder();

        const generator =
          new RuntimeResourceGenerator();

        const generatorContext = {
          names: {
            module:
              'ai-business-model-departments',

            permissionPrefix:
              'AI_BUSINESS_MODEL_DEPARTMENTS'
          },

          primaryKey: {
            columns: [
              'id'
            ]
          },

          api: {
            basePath:
              '/ia/ai-business-model-departments'
          },

          capabilities: {
            crud:
              true,

            optimisticLock:
              true
          },

          foreignKeys: [
            {
              column:
                'department_id',

              referencedTable:
                'ai_intelligent_departments'
            }
          ],

          columns: [
            {
              name:
                'id',

              type:
                'uuid',

              nullable:
                false,

              writable:
                false
            },

            {
              name:
                'department_id',

              type:
                'uuid',

              nullable:
                false,

              writable:
                true,

              hasDefaultValue:
                false
            },

            {
              name:
                'version_no',

              type:
                'integer',

              nullable:
                false,

              writable:
                false,

              hasDefaultValue:
                true,

              defaultValue:
                1
            }
          ]
        };

        const runtimeContext =
          builder.build(
            generatorContext
          );

        const content =
          await generator.render(
            runtimeContext
          );

        expect(content).toContain(
          'export const aiBusinessModelDepartmentsResource'
        );

        expect(content).toContain(
          'name: "ai-business-model-departments"'
        );

        expect(content).toContain(
          'primaryKey: "id"'
        );

        expect(content).toContain(
          'path: "/ia/ai-business-model-departments"'
        );

        expect(content).toContain(
          'method: "POST"'
        );

        expect(content).toContain(
          'method: "PATCH"'
        );

        expect(content).toContain(
          'method: "DELETE"'
        );

        expect(content).toContain(
          'optimisticLock:'
        );

        expect(content).toContain(
          'versionField: "version_no"'
        );

        expect(content).toContain(
          'expectedField: "expected_version_no"'
        );

        expect(content).toContain(
          'name: "department_id"'
        );

        expect(content).toContain(
          'type: "lookup"'
        );

        expect(content).toContain(
          'lookupResource: "ai-intelligent-departments"'
        );

        expect(content).toContain(
          'required: true'
        );

        expect(content).toContain(
          'name: "version_no"'
        );

        expect(content).toContain(
          'defaultValue: 1'
        );

        expect(content).toContain(
          'readonly: true'
        );

        expect(content).toContain(
          'type: "form"'
        );

        expect(content).toContain(
          'defaultTheme: "sbn-futuristic"'
        );
      }
    );
  }
);
