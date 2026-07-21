'use strict';

class RecommendationEngine {
  recommend(context, features, behaviors) {
    const recommendations = [];

    if (!features.hasPrimaryKey) {
      recommendations.push({
        code: 'MISSING_PRIMARY_KEY',
        severity: 'high',
        category: 'database',
        message:
          'La entidad no tiene llave primaria. Se recomienda definir una antes de generar el CRUD.'
      });
    }

    if (
      features.multiTenant &&
      !features.branchSecurity
    ) {
      recommendations.push({
        code: 'CONSIDER_BRANCH_SECURITY',
        severity: 'info',
        category: 'security',
        message:
          'La entidad es multiempresa. Evalúa si también requiere aislamiento por sucursal.'
      });
    }

    if (
      features.softDelete &&
      !features.audit
    ) {
      recommendations.push({
        code: 'SOFT_DELETE_WITHOUT_AUDIT',
        severity: 'medium',
        category: 'governance',
        message:
          'La entidad utiliza eliminación lógica, pero no se detectaron columnas completas de auditoría.'
      });
    }

    if (
      features.statusManagement &&
      !features.optimisticLock
    ) {
      recommendations.push({
        code: 'STATUS_WITHOUT_VERSIONING',
        severity: 'info',
        category: 'concurrency',
        message:
          'La entidad administra estados. Considera agregar version_no para evitar actualizaciones concurrentes.'
      });
    }

    if (
      features.jsonColumns.length > 0
    ) {
      recommendations.push({
        code: 'DEFINE_JSON_SCHEMA',
        severity: 'medium',
        category: 'validation',
        message:
          `Define esquemas de validación para: ${features.jsonColumns.join(', ')}.`
      });
    }

    if (
      Array.isArray(context.foreignKeys) &&
      context.foreignKeys.length > 0 &&
      features.indexCount === 0
    ) {
      recommendations.push({
        code: 'REVIEW_FOREIGN_KEY_INDEXES',
        severity: 'medium',
        category: 'performance',
        message:
          'La entidad contiene llaves foráneas. Verifica que las columnas relacionadas tengan índices.'
      });
    }

    if (behaviors.hierarchy.enabled) {
      recommendations.push({
        code: 'PREVENT_HIERARCHY_CYCLES',
        severity: 'high',
        category: 'domain',
        message:
          'La entidad es jerárquica. Agrega validación para evitar ciclos entre padres e hijos.'
      });
    }

    return recommendations;
  }
}

module.exports = RecommendationEngine;