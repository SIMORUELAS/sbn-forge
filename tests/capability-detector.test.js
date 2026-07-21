'use strict';

const CapabilityDetector = require(
  '../src/context/capability-detector'
);

describe('CapabilityDetector', () => {
  test('detecta capacidades estructurales', () => {
    const detector = new CapabilityDetector();

    const result = detector.detect({
      columns: [
        {
          name: 'id',
          nativeType: 'int8'
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
          name: 'configuration_json',
          nativeType: 'jsonb'
        },
        {
          name: 'created_at',
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

      foreignKeys: [
        {
          column: 'organization_id'
        }
      ]
    });

    expect(result.audit).toBe(true);
    expect(result.softDelete).toBe(true);
    expect(result.optimisticLock).toBe(true);
    expect(result.multiTenant).toBe(true);
    expect(result.branchSecurity).toBe(true);
    expect(result.foreignKeys).toBe(true);

    expect(result.jsonColumns).toEqual([
      'configuration_json'
    ]);
  });
});