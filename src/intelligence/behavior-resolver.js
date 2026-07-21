'use strict';

const PatternLibrary = require('./pattern-library');

class BehaviorResolver {
  constructor(dependencies = {}) {
    this.patternLibrary =
      dependencies.patternLibrary ||
      new PatternLibrary();
  }

  resolve(features) {
    if (!features || typeof features !== 'object') {
      throw new TypeError(
        'BehaviorResolver requiere features válidas'
      );
    }

    const behaviors = {
      crud: {
        enabled: true,
        operations: [
          'create',
          'findById',
          'findMany',
          'update',
          'delete'
        ],
        pattern:
          this.patternLibrary.get('standardCrud')
      },

      audit: {
        enabled: false,
        operations: [],
        pattern: null
      },

      softDelete: {
        enabled: false,
        operations: [],
        excludeDeletedByDefault: false,
        pattern: null
      },

      optimisticLock: {
        enabled: false,
        operations: [],
        pattern: null
      },

      tenancy: {
        enabled: false,
        filterColumn: null,
        operations: [],
        pattern: null
      },

      branchSecurity: {
        enabled: false,
        filterColumn: null,
        operations: [],
        pattern: null
      },

      statusManagement: {
        enabled: false,
        operations: [],
        pattern: null
      },

      hierarchy: {
        enabled: false,
        operations: [],
        pattern: null
      },

      jsonSupport: {
        enabled: false,
        columns: [],
        operations: [],
        pattern: null
      }
    };

    if (features.audit) {
      behaviors.audit = {
        enabled: true,
        operations: [
          'setCreatedMetadata',
          'setUpdatedMetadata'
        ],
        pattern:
          this.patternLibrary.get('auditTracking')
      };
    }

    if (features.softDelete) {
      behaviors.softDelete = {
        enabled: true,
        operations: [
          'softDelete',
          'restore',
          'findDeleted'
        ],
        excludeDeletedByDefault: true,
        pattern:
          this.patternLibrary.get('softDelete')
      };

      behaviors.crud.operations =
        behaviors.crud.operations.filter(
          (operation) => operation !== 'delete'
        );

      behaviors.crud.operations.push('softDelete');
    }

    if (features.optimisticLock) {
      behaviors.optimisticLock = {
        enabled: true,
        operations: [
          'validateVersion',
          'incrementVersion'
        ],
        pattern:
          this.patternLibrary.get(
            'optimisticLocking'
          )
      };
    }

    if (features.multiTenant) {
      behaviors.tenancy = {
        enabled: true,
        filterColumn: 'organization_id',
        operations: [
          'applyTenantFilter',
          'validateTenantAccess'
        ],
        pattern:
          this.patternLibrary.get('tenantIsolation')
      };
    }

    if (features.branchSecurity) {
      behaviors.branchSecurity = {
        enabled: true,
        filterColumn: 'branch_id',
        operations: [
          'applyBranchFilter',
          'validateBranchAccess'
        ],
        pattern:
          this.patternLibrary.get('branchIsolation')
      };
    }

    if (features.statusManagement) {
      behaviors.statusManagement = {
        enabled: true,
        operations: [
          'changeStatus',
          'validateStatus',
          'validateTransition'
        ],
        pattern:
          this.patternLibrary.get('statusWorkflow')
      };
    }

    if (features.hierarchical) {
      behaviors.hierarchy = {
        enabled: true,
        operations: [
          'findChildren',
          'findAncestors',
          'buildTree'
        ],
        pattern:
          this.patternLibrary.get(
            'hierarchicalEntity'
          )
      };
    }

    if (features.jsonColumns.length > 0) {
      behaviors.jsonSupport = {
        enabled: true,
        columns: [...features.jsonColumns],
        operations: [
          'validateJson',
          'patchJson'
        ],
        pattern:
          this.patternLibrary.get('dynamicJson')
      };
    }

    return behaviors;
  }
}

module.exports = BehaviorResolver;