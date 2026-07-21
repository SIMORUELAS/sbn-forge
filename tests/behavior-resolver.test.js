'use strict';

const BehaviorResolver = require(
  '../src/intelligence/behavior-resolver'
);

describe('BehaviorResolver', () => {
  test('resuelve comportamientos SBN', () => {
    const resolver = new BehaviorResolver();

    const behaviors = resolver.resolve({
      audit: true,
      softDelete: true,
      optimisticLock: true,
      multiTenant: true,
      branchSecurity: true,
      statusManagement: true,
      hierarchical: true,
      jsonColumns: ['configuration_json']
    });

    expect(behaviors.crud.enabled).toBe(true);

    expect(
      behaviors.crud.operations
    ).toContain('softDelete');

    expect(
      behaviors.crud.operations
    ).not.toContain('delete');

    expect(behaviors.audit.enabled).toBe(true);

    expect(
      behaviors.softDelete.excludeDeletedByDefault
    ).toBe(true);

    expect(
      behaviors.optimisticLock.enabled
    ).toBe(true);

    expect(behaviors.tenancy.enabled).toBe(true);

    expect(
      behaviors.branchSecurity.enabled
    ).toBe(true);

    expect(
      behaviors.statusManagement.enabled
    ).toBe(true);

    expect(behaviors.hierarchy.enabled).toBe(true);

    expect(behaviors.jsonSupport.columns).toEqual([
      'configuration_json'
    ]);
  });
});