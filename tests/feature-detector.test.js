'use strict';

const FeatureDetector = require(
  '../src/intelligence/feature-detector'
);

describe('FeatureDetector', () => {
  test('detecta características del dominio', () => {
    const detector = new FeatureDetector();

    const features = detector.detect({
      columns: [
        {
          name: 'id',
          nativeType: 'int8',
          identity: true
        },
        {
          name: 'organization_id',
          nativeType: 'uuid'
        },
        {
          name: 'branch_id',
          nativeType: 'uuid'
        },
        {
          name: 'status',
          nativeType: 'varchar'
        },
        {
          name: 'parent_id',
          nativeType: 'int8'
        },
        {
          name: 'configuration_json',
          nativeType: 'jsonb'
        },
        {
          name: 'created_at',
          nativeType: 'timestamp'
        },
        {
          name: 'updated_at',
          nativeType: 'timestamp'
        },
        {
          name: 'deleted_at',
          nativeType: 'timestamp'
        },
        {
          name: 'version_no',
          nativeType: 'int4'
        }
      ],

      primaryKey: {
        columns: ['id']
      },

      foreignKeys: [],

      indexes: []
    });

    expect(features.hasPrimaryKey).toBe(true);
    expect(features.identityPrimaryKey).toBe(true);
    expect(features.audit).toBe(true);
    expect(features.softDelete).toBe(true);
    expect(features.optimisticLock).toBe(true);
    expect(features.multiTenant).toBe(true);
    expect(features.branchSecurity).toBe(true);
    expect(features.statusManagement).toBe(true);
    expect(features.hierarchical).toBe(true);

    expect(features.jsonColumns).toEqual([
      'configuration_json'
    ]);
  });
});