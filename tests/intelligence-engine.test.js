'use strict';

const GeneratorContextBuilder = require(
  '../src/context/generator-context.builder'
);

const IntelligenceEngine = require(
  '../src/intelligence/intelligence-engine'
);

describe('IntelligenceEngine', () => {
  test('enriquece el Generator Context', () => {
    const builder = new GeneratorContextBuilder();

    const context = builder.build({
      source: {
        type: 'postgresql'
      },

      schema: 'simo_ai',

      table: 'ai_business_model_departments',

      columns: [
        {
          name: 'id',
          dataType: 'bigint',
          nativeType: 'int8',
          nullable: false,
          identity: true
        },
        {
          name: 'organization_id',
          dataType: 'uuid',
          nativeType: 'uuid',
          nullable: false
        },
        {
          name: 'branch_id',
          dataType: 'uuid',
          nativeType: 'uuid',
          nullable: false
        },
        {
          name: 'status',
          dataType: 'varchar',
          nativeType: 'varchar',
          nullable: false
        },
        {
          name: 'configuration_json',
          dataType: 'jsonb',
          nativeType: 'jsonb',
          nullable: true
        },
        {
          name: 'created_at',
          dataType: 'timestamp',
          nativeType: 'timestamp',
          nullable: false
        },
        {
          name: 'deleted_at',
          dataType: 'timestamp',
          nativeType: 'timestamp',
          nullable: true
        },
        {
          name: 'version_no',
          dataType: 'integer',
          nativeType: 'int4',
          nullable: false
        }
      ],

      primaryKey: {
        name: 'pk_departments',
        columns: ['id']
      },

      foreignKeys: [],

      indexes: []
    });

    const engine = new IntelligenceEngine();

    const enrichedContext =
      engine.analyze(context);

    expect(enrichedContext.intelligence).toBeDefined();

    expect(
      enrichedContext.intelligence.engineVersion
    ).toBe('1.0.0');

    expect(
      enrichedContext.intelligence.features.softDelete
    ).toBe(true);

    expect(
      enrichedContext.intelligence.behaviors
        .softDelete.enabled
    ).toBe(true);

    expect(
      enrichedContext.intelligence.behaviors
        .tenancy.enabled
    ).toBe(true);

    expect(
      enrichedContext.intelligence.behaviors
        .branchSecurity.enabled
    ).toBe(true);

    expect(
      enrichedContext.intelligence.behaviors
        .statusManagement.enabled
    ).toBe(true);

    expect(
      enrichedContext.intelligence.summary
        .enabledBehaviors
    ).toBeGreaterThan(0);
  });

  test('no modifica el contexto original', () => {
    const context = {
      columns: [],
      primaryKey: {
        columns: []
      },
      foreignKeys: [],
      indexes: []
    };

    const originalContext = {
      ...context
    };

    const engine = new IntelligenceEngine();

    engine.analyze(context);

    expect(context).toEqual(originalContext);

    expect(context.intelligence).toBeUndefined();
  });
});