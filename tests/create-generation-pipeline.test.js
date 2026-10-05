'use strict';

const {
  createGenerationPipeline
} = require(
  '../src/pipeline/create-generation-pipeline'
);

const {
  GenerationPipeline
} = require(
  '../src/pipeline/generation-pipeline'
);

describe('createGenerationPipeline', () => {
  test('crea una instancia de GenerationPipeline', () => {
    const pipeline =
      createGenerationPipeline();

    expect(pipeline).toBeInstanceOf(
      GenerationPipeline
    );
  });

  test('permite inyectar dependencias', async () => {
    const contextBuilder = {
      build(definition) {
        return {
          ...definition,
          contextBuilt: true
        };
      }
    };

    const intelligenceEngine = {
      analyze(context) {
        return {
          ...context,
          intelligenceApplied: true
        };
      }
    };

    const ruleEngine = {
      apply(context) {
        return {
          ...context,
          rulesApplied: true
        };
      }
    };

    const apiGenerator = {
      generate(context) {
        return {
          generated: true,
          context
        };
      }
    };

    const pipeline =
      createGenerationPipeline({
        contextBuilder,
        intelligenceEngine,
        ruleEngine,
        apiGenerator
      });

    const result = await pipeline.execute({
      type: 'api',

      definition: {
        schema: 'public',
        table: 'example_table'
      }
    });

    expect(result.context).toMatchObject({
      schema: 'public',
      table: 'example_table',
      contextBuilt: true,
      intelligenceApplied: true,
      rulesApplied: true
    });

    expect(result.generation.generated).toBe(
      true
    );
  });
});
describe(
  'createGenerationPipeline runtime generation',
  () => {
    test(
      'builds the runtime resource context and generates the resource file',
      async () => {
        const runtimeContextBuilder = {
          build(context) {
            return {
              name:
                context.names.module,

              code:
                'AI_INTELLIGENT_DEPARTMENTS',

              label:
                'Departamentos Inteligentes',

              primaryKey:
                'id',

              api: {
                list: {
                  path:
                    '/ia/ai-intelligent-departments',

                  method:
                    'GET'
                }
              },

              fields: [],

              views: [
                {
                  type:
                    'list'
                }
              ],

              defaultTheme:
                'sbn-futuristic'
            };
          }
        };

        const runtimeResourceGenerator = {
          generate(
            runtimeContext,
            options
          ) {
            return {
              runtimeContext,
              output:
                options.output
            };
          }
        };

        const pipeline =
          createGenerationPipeline({
            contextBuilder: {
              build() {
                return {
                  names: {
                    module:
                      'ai-intelligent-departments'
                  },

                  generatorContext:
                    true
                };
              }
            },

            intelligenceEngine: {
              analyze(context) {
                return context;
              }
            },

            ruleEngine: {
              apply(context) {
                return context;
              }
            },

            runtimeContextBuilder,
            runtimeResourceGenerator
          });

        const result =
          await pipeline.execute({
            type:
              'runtime',

            definition: {
              schema:
                'simo_ai',

              table:
                'ai_intelligent_departments'
            },

            options: {
              output:
                './output/runtime'
            }
          });

        expect(
          result.context.generatorContext
        ).toBe(
          true
        );

        expect(
          result.generation.runtimeContext
            .name
        ).toBe(
          'ai-intelligent-departments'
        );

        expect(
          result.generation.output
        ).toBe(
          './output/runtime'
        );
      }
    );
  }
);

describe(
  'createGenerationPipeline real runtime integration',
  () => {
    test(
      'generates a runtime resource file with the real runtime components',
      async () => {
        const fs =
          require(
            'fs-extra'
          );

        const os =
          require(
            'os'
          );

        const path =
          require(
            'path'
          );

        const output =
          await fs.mkdtemp(
            path.join(
              os.tmpdir(),
              'forge-pipeline-runtime-'
            )
          );

        try {
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

          const pipeline =
            createGenerationPipeline({
              contextBuilder: {
                build() {
                  return generatorContext;
                }
              },

              intelligenceEngine: {
                analyze(context) {
                  return context;
                }
              },

              ruleEngine: {
                apply(context) {
                  return context;
                }
              }
            });

          const result =
            await pipeline.execute({
              type:
                'runtime',

              definition: {
                schema:
                  'simo_ai',

                table:
                  'ai_business_model_departments'
              },

              options: {
                output
              }
            });

          const expectedFile =
            path.join(
              output,
              'ai-business-model-departments.resource.ts'
            );

          expect(
            await fs.pathExists(
              expectedFile
            )
          ).toBe(
            true
          );

          const content =
            await fs.readFile(
              expectedFile,
              'utf8'
            );

          expect(content).toContain(
            'export const aiBusinessModelDepartmentsResource'
          );

          expect(content).toContain(
            'name: "ai-business-model-departments"'
          );

          expect(content).toContain(
            'method: "PATCH"'
          );

          expect(content).toContain(
            'optimisticLock:'
          );

          expect(content).toContain(
            'type: "lookup"'
          );

          expect(content).toContain(
            'lookupResource: "ai-intelligent-departments"'
          );

          expect(
            result.generation.written
          ).toBe(
            true
          );

          expect(
            result.generation.absolutePath
          ).toBe(
            path.resolve(
              expectedFile
            )
          );
        }
        finally {
          await fs.remove(
            output
          );
        }
      }
    );
  }
);
