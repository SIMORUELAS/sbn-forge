'use strict';

const naming = require('../core/naming');

const MetadataNormalizer = require(
  './metadata-normalizer'
);

const CapabilityDetector = require(
  './capability-detector'
);

const GeneratorContextValidator = require(
  './generator-context.validator'
);

const {
  resolveProfile
} = require(
  '../profiles/profile-resolver'
);

class GeneratorContextBuilder {
  constructor(dependencies = {}) {
    this.metadataNormalizer =
      dependencies.metadataNormalizer ||
      new MetadataNormalizer();

    this.capabilityDetector =
      dependencies.capabilityDetector ||
      new CapabilityDetector();

    this.validator =
      dependencies.validator ||
      new GeneratorContextValidator();

    this.profileResolver =
      dependencies.profileResolver ||
      resolveProfile;
  }

  build(input = {}) {
    const requestedProfile =
      this.resolveRequestedProfile(input);

    const profile =
      this.profileResolver(
        requestedProfile
      );

    const metadata =
      this.metadataNormalizer.normalize(
        input
      );

     this.validateMetadata(metadata);

        const normalizedColumns =
      metadata.columns.map(column => {
        const defaultValue =
          column.defaultValue ??
          column.default ??
          null;

        const hasDefaultValue =
          column.hasDefaultValue === true ||
          column.hasDefault === true ||
          (
            defaultValue !== null &&
            defaultValue !== undefined
          );

        const identity =
          column.identity === true ||
          column.generated === true;

        return {
          ...column,

          identity,

          defaultValue,

          hasDefaultValue,

          jsonSchema:
            this.buildJsonSchema(column)
        };
      });


    const writableColumns =
      normalizedColumns
        .filter(column => column.writable);

    const requiredWritableColumns =
      writableColumns.filter(
        column =>
          column.nullable === false &&
          column.hasDefaultValue === false
      );

    const columnMap =
      Object.fromEntries(
        normalizedColumns.map(column => [
          column.name,
          column
        ])
      );

  

    const names =
      this.buildNames(
        metadata.table
      );

    const detectedCapabilities =
      this.capabilityDetector.detect(
        metadata
      );

      const capabilities =
      this.buildCapabilities(
        detectedCapabilities,
        profile,
        normalizedColumns
      );
      
    const permissions =
      this.buildPermissions(
        names.permissionPrefix
      );

    const api =
      this.buildApiContext(
        input,
        names,
        profile
      );

    const context = {
      forge: {
        contextVersion: '1.0.0',

        generatedAt:
          new Date().toISOString(),

        profile:
          profile.name,

        standard:
          profile.standard
      },

      source:
        metadata.source,

      database: {
        schema:
          metadata.schema,

        table:
          metadata.table
      },

      names,

      columns: normalizedColumns,

      writableColumns,

      requiredWritableColumns,

      createRequiredColumns:
        requiredWritableColumns,

      columnMap,

      primaryKey:
        metadata.primaryKey || {
          name: null,
          columns: []
        },

      foreignKeys:
        metadata.foreignKeys || [],

      indexes:
        metadata.indexes || [],

      constraints:
        metadata.constraints || [],

      profile: {
        name:
          profile.name,

        standard:
          profile.standard,

        files: {
          ...(profile.files || {})
        }
      },

      standard:
        profile.standard,

      capabilities,

      security: {
        jwt:
          Boolean(
            profile.security?.jwt
          ),

        permissions:
          Boolean(
            profile.security
              ?.permissions
          ),

        organizationContext:
          Boolean(
            profile.security
              ?.organizationContext
          )
      },

      permissions,

      api,

      generation: {
        profile:
          profile.name,

        backend: true,

        frontend: false,

        documentation:
          this.shouldGenerateDocumentation(
            profile
          ),

        tests:
          this.shouldGenerateTests(
            profile
          ),

        files: {
          ...(profile.files || {})
        }
      }
    };

    return this.validator
      .validateOrThrow(
        context
      );
  }

  resolveRequestedProfile(input) {
    const profileName =
      input.profile ||
      input.generation?.profile ||
      input.options?.profile ||
      'generic';

    if (
      typeof profileName !== 'string' ||
      profileName.trim() === ''
    ) {
      throw new TypeError(
        'El perfil de generación debe ser una cadena válida'
      );
    }

    return profileName
      .trim()
      .toLowerCase();
  }

  validateMetadata(metadata) {
    if (
      !metadata ||
      typeof metadata !== 'object'
    ) {
      throw new TypeError(
        'MetadataNormalizer debe devolver un objeto válido'
      );
    }

    if (
      typeof metadata.table !==
        'string' ||
      metadata.table.trim() === ''
    ) {
      throw new TypeError(
        'GeneratorContextBuilder requiere el nombre de la tabla'
      );
    }

    if (
      !Array.isArray(
        metadata.columns
      )
    ) {
      throw new TypeError(
        'GeneratorContextBuilder requiere un arreglo de columnas'
      );
    }
  }

    buildCapabilities(
    detectedCapabilities,
    profile,
    columns = []
  ) {
    const profileCapabilities =
      profile.capabilities || {};

    const detected =
      detectedCapabilities || {};

    return {
      /*
       * Capacidad CRUD base.
       *
       * Se mantiene habilitada mientras el detector
       * o el perfil no la desactiven explícitamente.
       */
      crud:
        profileCapabilities.crud !==
          false &&
        detected.crud !== false,

      /*
       * Capacidades funcionales que dependen
       * directamente del perfil de generación.
       */
      bulk:
        Boolean(
          profileCapabilities.bulk
        ),

      bulkCreate:
        Boolean(
          profileCapabilities
            .bulkCreate ??
          profileCapabilities.bulk
        ),

      copy:
        Boolean(
          profileCapabilities.copy
        ),

      validate:
        Boolean(
          profileCapabilities.validate
        ),

      summary:
        Boolean(
          profileCapabilities.summary
        ),

      /*
       * Reorder requiere dos condiciones:
       *
       * 1. Que el perfil lo habilite.
       * 2. Que exista la columna execution_order.
       */
      reorder:
        Boolean(
          profileCapabilities.reorder
        ) &&
        columns.some(
          column =>
            column.name ===
            'execution_order'
        ),

      /*
       * Capacidades estructurales.
       *
       * Estas capacidades se determinan mediante
       * el análisis real de la tabla y no deben
       * desactivarse por el perfil.
       */
      audit:
        Boolean(
          detected.audit
        ),

      auditColumns:
        Array.isArray(
          detected.auditColumns
        )
          ? detected.auditColumns
          : [],

      softDelete:
        Boolean(
          detected.softDelete
        ),

      optimisticLock:
        Boolean(
          detected.optimisticLock
        ),

      multiTenant:
        Boolean(
          detected.multiTenant
        ),

      branchSecurity:
        Boolean(
          detected.branchSecurity
        ),

      statusManagement:
        Boolean(
          detected.statusManagement
        ),

      jsonColumns:
        Array.isArray(
          detected.jsonColumns
        )
          ? detected.jsonColumns
          : [],

      foreignKeys:
        Boolean(
          detected.foreignKeys
        ),

      hasPrimaryKey:
        Boolean(
          detected.hasPrimaryKey
        )
    };
  }
  

  buildApiContext(
    input,
    names,
    profile
  ) {
    const configuredPrefix =
      input.api?.prefix ||
      input.apiPrefix ||
      profile.api?.prefix ||
      '/ia';

    const prefix =
      this.normalizeRoutePrefix(
        configuredPrefix
      );

    const configuredBasePath =
      input.api?.basePath ||
      input.basePath ||
      profile.api?.basePath;

    const basePath =
      configuredBasePath
        ? this.normalizeRoutePath(
            configuredBasePath
          )
        : this.normalizeRoutePath(
            `${prefix}/${names.route}`
          );

    const configuredBaseUrl =
      input.api?.baseUrl ||
      input.baseUrl ||
      profile.api?.baseUrl ||
      'http://localhost:3500';

    return {
      standard:
        profile.standard,

      prefix,

      basePath,

      baseUrl:
        configuredBaseUrl,

      route:
        names.route
    };
  }

  buildPermissions(
    permissionPrefix
  ) {
    return {
      view:
        `${permissionPrefix}_VIEW`,

      create:
        `${permissionPrefix}_CREATE`,

      edit:
        `${permissionPrefix}_EDIT`,

      delete:
        `${permissionPrefix}_DELETE`,

      reorder:
        `${permissionPrefix}_REORDER`,

      copy:
        `${permissionPrefix}_COPY`
    };
  }

  shouldGenerateDocumentation(
    profile
  ) {
    const files =
      profile.files || {};

    return Boolean(
      files.readme ||
      files.apiExamples ||
      files.dictionary ||
      files.migration ||
      files.seeds ||
      files.utilsRequired
    );
  }

  shouldGenerateTests(
    profile
  ) {
    const files =
      profile.files || {};

    return Boolean(
      files.httpTest
    );
  }

  buildNames(tableName) {
    if (
      typeof tableName !==
        'string' ||
      tableName.trim() === ''
    ) {
      throw new TypeError(
        'buildNames requiere un nombre de tabla válido'
      );
    }

    const normalizedTableName =
      tableName.trim();

    const moduleName =
      typeof naming.toKebabCase ===
      'function'
        ? naming.toKebabCase(
            normalizedTableName
          )
        : normalizedTableName
            .replaceAll(
              '_',
              '-'
            );

    const entityName =
      typeof naming.toPascalCase ===
      'function'
        ? naming.toPascalCase(
            normalizedTableName
          )
        : this.toPascalCase(
            normalizedTableName
          );

    const camelName =
      typeof naming.toCamelCase ===
      'function'
        ? naming.toCamelCase(
            normalizedTableName
          )
        : this.toCamelCase(
            normalizedTableName
          );

    const permissionPrefix =
      normalizedTableName
        .replace(
          /[^a-zA-Z0-9]+/g,
          '_'
        )
        .replace(
          /^_+|_+$/g,
          ''
        )
        .toUpperCase();

    return {
      table:
        normalizedTableName,

      module:
        moduleName,

      entity:
        entityName,

      variable:
        camelName,

      route:
        moduleName,

      permissionPrefix
    };
  }

  normalizeRoutePrefix(value) {
    if (
      typeof value !== 'string' ||
      value.trim() === ''
    ) {
      return '/ia';
    }

    const normalized =
      value.trim();

    return normalized
      .startsWith('/')
      ? normalized.replace(
          /\/+$/g,
          ''
        )
      : `/${normalized.replace(
          /\/+$/g,
          ''
        )}`;
  }

  normalizeRoutePath(value) {
    if (
      typeof value !== 'string' ||
      value.trim() === ''
    ) {
      throw new TypeError(
        'La ruta de API debe ser una cadena válida'
      );
    }

    const normalized =
      value
        .trim()
        .replace(
          /\/+/g,
          '/'
        );

    return normalized
      .startsWith('/')
      ? normalized.replace(
          /\/+$/g,
          ''
        )
      : `/${normalized.replace(
          /\/+$/g,
          ''
        )}`;
  }

  toPascalCase(value) {
    if (
      typeof value !== 'string'
    ) {
      throw new TypeError(
        'toPascalCase requiere una cadena de texto'
      );
    }

    return value
      .split(/[_\-\s]+/)
      .filter(Boolean)
      .map(
        part =>
          part
            .charAt(0)
            .toUpperCase() +
          part
            .slice(1)
            .toLowerCase()
      )
      .join('');
  }

  toCamelCase(value) {
    const pascalValue =
      this.toPascalCase(value);

    if (
      pascalValue === ''
    ) {
      return '';
    }

    return (
      pascalValue
        .charAt(0)
        .toLowerCase() +
      pascalValue.slice(1)
    );
  }

  
buildJsonSchema(column) {
  switch (column.dataType) {
    case 'uuid':
      return {
        type: 'string',
        format: 'uuid'
      };

    case 'boolean':
      return {
        type: 'boolean'
      };

    case 'integer':
    case 'int':
    case 'int4':
    case 'smallint':
      return {
        type: 'integer'
      };

    case 'bigint':
    case 'int8':
      return {
        type: 'integer'
      };

    case 'numeric':
    case 'decimal':
    case 'float':
    case 'double':
      return {
        type: 'number'
      };

    case 'json':
    case 'jsonb':
      return {
        type: 'object'
      };

    case 'date':
      return {
        type: 'string',
        format: 'date'
      };

    case 'timestamp':
    case 'timestamptz':
      return {
        type: 'string',
        format: 'date-time'
      };

    default:
      return {
        type: 'string'
      };
  }
}





}




module.exports =
  GeneratorContextBuilder;