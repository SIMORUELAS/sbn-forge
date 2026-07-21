'use strict';

const RecommendationEngine = require(
  '../src/intelligence/recommendation-engine'
);

describe('RecommendationEngine', () => {
  test('genera recomendaciones arquitectónicas', () => {
    const engine = new RecommendationEngine();

    const recommendations = engine.recommend(
      {
        foreignKeys: [
          {
            column: 'organization_id'
          }
        ]
      },

      {
        hasPrimaryKey: false,
        multiTenant: true,
        branchSecurity: false,
        softDelete: true,
        audit: false,
        statusManagement: true,
        optimisticLock: false,
        jsonColumns: ['configuration_json'],
        indexCount: 0
      },

      {
        hierarchy: {
          enabled: false
        }
      }
    );

    const codes = recommendations.map(
      (recommendation) => recommendation.code
    );

    expect(codes).toContain(
      'MISSING_PRIMARY_KEY'
    );

    expect(codes).toContain(
      'CONSIDER_BRANCH_SECURITY'
    );

    expect(codes).toContain(
      'SOFT_DELETE_WITHOUT_AUDIT'
    );

    expect(codes).toContain(
      'STATUS_WITHOUT_VERSIONING'
    );

    expect(codes).toContain(
      'DEFINE_JSON_SCHEMA'
    );

    expect(codes).toContain(
      'REVIEW_FOREIGN_KEY_INDEXES'
    );
  });
});