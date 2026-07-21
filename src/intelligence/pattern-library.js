'use strict';

class PatternLibrary {
  constructor() {
    this.patterns = {
      standardCrud: {
        id: 'standard-crud',
        category: 'application',
        description:
          'Operaciones estándar de creación, consulta, actualización y eliminación'
      },

      auditTracking: {
        id: 'audit-tracking',
        category: 'governance',
        description:
          'Seguimiento de creación y modificación de registros'
      },

      softDelete: {
        id: 'soft-delete',
        category: 'persistence',
        description:
          'Eliminación lógica y restauración de registros'
      },

      optimisticLocking: {
        id: 'optimistic-locking',
        category: 'concurrency',
        description:
          'Control de concurrencia mediante versión del registro'
      },

      tenantIsolation: {
        id: 'tenant-isolation',
        category: 'security',
        description:
          'Aislamiento de información por organización o tenant'
      },

      branchIsolation: {
        id: 'branch-isolation',
        category: 'security',
        description:
          'Aislamiento y autorización por sucursal'
      },

      statusWorkflow: {
        id: 'status-workflow',
        category: 'domain',
        description:
          'Administración de estados y transiciones'
      },

      hierarchicalEntity: {
        id: 'hierarchical-entity',
        category: 'domain',
        description:
          'Modelo jerárquico padre-hijo'
      },

      dynamicJson: {
        id: 'dynamic-json',
        category: 'validation',
        description:
          'Validación y actualización de columnas JSON'
      }
    };
  }

  get(patternName) {
    return this.patterns[patternName] || null;
  }

  getAll() {
    return {
      ...this.patterns
    };
  }
}

module.exports = PatternLibrary;