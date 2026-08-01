'use strict';

const naming =
  require('../core/naming');

const MetadataNormalizer =
  require(
    './metadata-normalizer'
  );

const CapabilityDetector =
  require(
    './capability-detector'
  );

const GeneratorContextValidator =
  require(
    './generator-context.validator'
  );

const {
  resolveProfile
} = require(
  '../profiles/profile-resolver'
);

/**
 * Convierte un valor JavaScript en un
 * literal SQL seguro para archivos seeds.
 *
 * Soporta:
 *
 * - NULL
 * - boolean
 * - number
 * - string
 * - json
 * - jsonb
 */
function toSqlLiteral(
  value,
  column = {}
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 'NULL';
  }

  const dataType =
    String(
      column.dataType ||
      column.type ||
      column.nativeType ||
      ''
    )
      .trim()
      .toLowerCase();

  if (
    dataType === 'jsonb' ||
    dataType === 'json'
  ) {
    const json =
      JSON.stringify(
        value
      )
        .replace(
          /'/g,
          "''"
        );

    return (
      `'${json}'::${dataType}`
    );
  }

  if (
    typeof value === 'boolean'
  ) {
    return value
      ? 'true'
      : 'false';
  }

  if (
    typeof value === 'number'
  ) {
    if (
      !Number.isFinite(
        value
      )
    ) {
      throw new TypeError(
        'Los valores numéricos de seeds deben ser finitos.'
      );
    }

    return String(
      value
    );
  }

  const escaped =
    String(
      value
    )
      .replace(
        /'/g,
        "''"
      );

  return `'${escaped}'`;
}

/**
 * Convierte los objetos definidos en:
 *
 * definition.seeds
 *
 * en una estructura sencilla que puede
 * consumir el template database/seeds.hbs.
 */
function buildSeedStatements(
  seeds,
  columns
) {
  if (
    !Array.isArray(
      seeds
    ) ||
    seeds.length === 0
  ) {
    return [];
  }

  if (
    !Array.isArray(
      columns
    )
  ) {
    throw new TypeError(
      'buildSeedStatements requiere un arreglo de columnas.'
    );
  }

  const columnMap =
    Object.fromEntries(
      columns.map(
        column => [
          column.name,
          column
        ]
      )
    );

  return seeds.map(
    (
      seed,
      seedIndex
    ) => {
      if (
        !seed ||
        typeof seed !==
          'object' ||
        Array.isArray(
          seed
        )
      ) {
        throw new TypeError(
          `El seed en la posición ${seedIndex} debe ser un objeto.`
        );
      }

      const unknownColumns =
        Object.keys(
          seed
        )
          .filter(
            columnName =>
              !Object.prototype
                .hasOwnProperty.call(
                  columnMap,
                  columnName
                )
          );

      if (
        unknownColumns.length >
        0
      ) {
        throw new Error(
          'El seed contiene columnas que no existen: ' +
          unknownColumns.join(
            ', '
          )
        );
      }

      const entries =
        Object.entries(
          seed
        );

      if (
        entries.length === 0
      ) {
        throw new Error(
          `El seed en la posición ${seedIndex} está vacío.`
        );
      }

      return {
        columns:
          entries.map(
            (
              [
                columnName
              ]
            ) =>
              columnName
          ),

        values:
          entries.map(
            (
              [
                columnName,
                value
              ]
            ) =>
              toSqlLiteral(
                value,
                columnMap[
                  columnName
                ]
              )
          )
      };
    }
  );
}

class GeneratorContextBuilder {
  constructor(
    dependencies = {}
  ) {
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
      this.resolveRequestedProfile(
        input
      );

    const profile =
      this.profileResolver(
        requestedProfile
      );

    const metadata =
      this.metadataNormalizer.normalize(
        input
      );

    this.validateMetadata(
      metadata
    );

    /*
     * Enriquece las columnas normalizadas
     * con información que será utilizada
     * por los diferentes templates.
     */
    const normalizedColumns =
      metadata.columns.map(
        column => {
          const defaultValue =
            column.defaultValue ??
            column.default ??
            null;

          const hasDefaultValue =
            column.hasDefaultValue ===
              true ||
            column.hasDefault ===
              true ||
            (
              defaultValue !== null &&
              defaultValue !== undefined
            );

          /*
           * Una columna identity o marcada
           * como generated no debe ser
           * escrita directamente por la API.
           */
          const identity =
            column.identity === true ||
            column.generated === true;

          const jsonSchema =
            this.buildJsonSchema(
              column
            );

          return {
            ...column,

            identity,

            defaultValue,

            hasDefaultValue,

            jsonSchema,

            /*
             * Versión serializada para los
             * templates Markdown.
             */
            jsonSchemaText:
              JSON.stringify(
                jsonSchema,
                null,
                2
              )
          };
        }
      );

    /*
     * Columnas que pueden recibirse en
     * operaciones de creación o actualización.
     */
    const writableColumns =
      normalizedColumns.filter(
        column =>
          column.writable === true
      );

    /*
     * Columnas obligatorias:
     *
     * - escribibles;
     * - NOT NULL;
     * - sin valor predeterminado.
     */
    const requiredWritableColumns =
      writableColumns.filter(
        column =>
          column.nullable === false &&
          column.hasDefaultValue ===
            false
      );

    /*
     * Facilita la consulta de metadata
     * de columnas por su nombre.
     */
    const columnMap =
      Object.fromEntries(
        normalizedColumns.map(
          column => [
            column.name,
            column
          ]
        )
      );

    /*
     * Los seeds pertenecen a la definición
     * funcional original y no a la metadata
     * estructural normalizada.
     */
    const seeds =
      Array.isArray(
        input.seeds
      )
        ? input.seeds
        : [];

    const seedStatements =
      buildSeedStatements(
        seeds,
        normalizedColumns
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

    /*
     * Ejemplos reutilizables para:
     *
     * - API_EXAMPLES.md;
     * - archivos HTTP;
     * - Postman;
     * - OpenAPI;
     * - futuras pruebas de integración.
     */


          const apiExamples =
        this.buildApiExamples({
          columns:
            normalizedColumns,

          writableColumns,

          primaryKey:
            metadata.primaryKey,

          capabilities
        });

      const api =
        this.buildApiContext(
          input,
          names,
          profile
        );

      const security = {
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
      };

      const postmanCollection =
        this.buildPostmanCollection({
          names,

          api,

          apiExamples,

          security,

          permissions
        });



    const context = {
      forge: {
        contextVersion:
          '1.0.0',

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

      columns:
        normalizedColumns,

      writableColumns,

      requiredWritableColumns,

      /*
       * Alias utilizado por algunos templates
       * y generadores.
       */
      createRequiredColumns:
        requiredWritableColumns,

      columnMap,

      primaryKey:
        metadata.primaryKey || {
          name:
            null,

          columns:
            []
        },

      foreignKeys:
        metadata.foreignKeys || [],

      indexes:
        metadata.indexes || [],

      constraints:
        metadata.constraints || [],

      /*
       * Datos iniciales y sentencias
       * preparadas para seeds.hbs.
       */
      seeds,

      seedStatements,

      profile: {
        name:
          profile.name,

        standard:
          profile.standard,

        files: {
          ...(
            profile.files ||
            {}
          )
        }
      },

      standard:
        profile.standard,

      capabilities,

      security,

      permissions,

      api,

      apiExamples,

      postmanCollection,

      generation: {
        profile:
          profile.name,

        backend:
          true,

        frontend:
          false,

        documentation:
          this.shouldGenerateDocumentation(
            profile
          ),

        tests:
          this.shouldGenerateTests(
            profile
          ),

        files: {
          ...(
            profile.files ||
            {}
          )
        }
      }
    };

    return this.validator
      .validateOrThrow(
        context
      );
  }

    resolveRequestedProfile(
    input
  ) {
    const profileName =
      input.profile ||
      input.generation?.profile ||
      input.options?.profile ||
      'generic';

    if (
      typeof profileName !==
        'string' ||
      profileName.trim() ===
        ''
    ) {
      throw new TypeError(
        'El perfil de generación debe ser una cadena válida'
      );
    }

    return profileName
      .trim()
      .toLowerCase();
  }

  validateMetadata(
    metadata
  ) {
    if (
      !metadata ||
      typeof metadata !==
        'object'
    ) {
      throw new TypeError(
        'MetadataNormalizer debe devolver un objeto válido'
      );
    }

    if (
      typeof metadata.table !==
        'string' ||
      metadata.table.trim() ===
        ''
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
       * Se mantiene habilitada mientras
       * ni el perfil ni el detector la
       * desactiven explícitamente.
       */
      crud:
        profileCapabilities.crud !==
          false &&
        detected.crud !== false,

      /*
       * Capacidades controladas por
       * el perfil de generación.
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
       * 2. Que exista execution_order.
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
       * Capacidades estructurales
       * detectadas desde la tabla.
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
      files.utilsRequired ||
      files.postmanCollection
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

    buildNames(
    tableName
  ) {
    if (
      typeof tableName !==
        'string' ||
      tableName.trim() ===
        ''
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

  normalizeRoutePrefix(
    value
  ) {
    if (
      typeof value !==
        'string' ||
      value.trim() ===
        ''
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

  normalizeRoutePath(
    value
  ) {
    if (
      typeof value !==
        'string' ||
      value.trim() ===
        ''
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

  toPascalCase(
    value
  ) {
    if (
      typeof value !==
        'string'
    ) {
      throw new TypeError(
        'toPascalCase requiere una cadena de texto'
      );
    }

    return value
      .split(
        /[_\-\s]+/
      )
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

  toCamelCase(
    value
  ) {
    const pascalValue =
      this.toPascalCase(
        value
      );

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

  buildExampleValue(
    column
  ) {
    const type =
      String(
        column.dataType ||
        column.type ||
        column.nativeType ||
        ''
      )
        .trim()
        .toLowerCase();

    switch (type) {
      case 'uuid':
        return (
          '550e8400-e29b-41d4-' +
          'a716-446655440000'
        );

      case 'boolean':
      case 'bool':
        return true;

      case 'integer':
      case 'int':
      case 'int2':
      case 'int4':
      case 'smallint':
      case 'bigint':
      case 'int8':
        return 1;

      case 'numeric':
      case 'decimal':
      case 'real':
      case 'float':
      case 'float4':
      case 'float8':
      case 'double':
      case 'double precision':
        return 1.5;

      case 'json':
      case 'jsonb':
        return {
          enabled: true
        };

      case 'date':
        return '2026-07-31';

      case 'timestamp':
      case 'timestamptz':
      case 'timestamp without time zone':
      case 'timestamp with time zone':
        return (
          '2026-07-31T12:00:00.000Z'
        );

      default:
        return this.buildStringExample(
          column
        );
    }
  }

  buildStringExample(
    column
  ) {
    const examples = {
      code:
        'SBN-EXAMPLE',

      name:
        'Registro de ejemplo',

      description:
        'Descripción de ejemplo generada por SBN Forge.',

      status:
        'active',

      lifecycle_stage:
        'development',

      model_scope:
        'global_template',

      default_update_strategy:
        'manual_approval',

      current_version:
        '1.0.0'
    };

    return (
      examples[column.name] ||
      `example_${column.name}`
    );
  }



  buildApiExamples({
    columns,
    writableColumns,
    primaryKey,
    capabilities
  }) {
    const createExample =
      Object.fromEntries(
        writableColumns.map(
          column => [
            column.name,
            this.buildExampleValue(
              column
            )
          ]
        )
      );

    /*
     * Para PATCH usamos solamente algunas
     * columnas representativas.
     */
    const updateExample =
      Object.fromEntries(
        writableColumns
          .slice(
            0,
            3
          )
          .map(
            column => [
              column.name,
              this.buildExampleValue(
                column
              )
            ]
          )
      );

    if (
      capabilities.optimisticLock
    ) {
      updateExample
        .expected_version_no = 1;
    }

    const primaryKeyName =
      primaryKey?.columns?.[0] ||
      primaryKey?.name ||
      null;

    const primaryKeyColumn =
      columns.find(
        column =>
          column.name ===
          primaryKeyName
      );

    const idExample =
      primaryKeyColumn
        ? this.buildExampleValue(
            primaryKeyColumn
          )
        : 1;

    return {
      idExample,

      create:
        createExample,

      update:
        updateExample,

      createBody:
        JSON.stringify(
          createExample,
          null,
          2
        ),

      updateBody:
        JSON.stringify(
          updateExample,
          null,
          2
        )
    };
  }


    buildPostmanCollection({
    names,
    api,
    apiExamples,
    security,
    permissions
      }) {
        const headers = [
          {
            key:
              'Content-Type',

            value:
              'application/json',

            type:
              'text'
          }
        ];

        if (
          security?.jwt === true
        ) {
          headers.push({
            key:
              'Authorization',

            value:
              'Bearer {{token}}',

            type:
              'text'
          });
        }

        return {
          collectionName:
            `${names.entity} API`,

          moduleName:
            names.module,

          baseUrl:
            api.baseUrl,

          basePath:
            api.basePath,

          listUrl:
            `{{baseUrl}}${api.basePath}`,

          getUrl:
            `{{baseUrl}}${api.basePath}/{{id}}`,

          createUrl:
            `{{baseUrl}}${api.basePath}`,

          updateUrl:
            `{{baseUrl}}${api.basePath}/{{id}}`,

          deleteUrl:
            `{{baseUrl}}${api.basePath}/{{id}}`,

          headers,

          bodyCreate:
            apiExamples.createBody,

          bodyUpdate:
            apiExamples.updateBody,

          /*
          * JSON.stringify convierte el body JSON
          * en una cadena válida para body.raw
          * dentro de la colección Postman.
          */
          bodyCreateJson:
            JSON.stringify(
              apiExamples.createBody
            ),

          bodyUpdateJson:
            JSON.stringify(
              apiExamples.updateBody
            ),

          idExample:
            apiExamples.idExample,

          jwt:
            security?.jwt === true,

          permissions: {
            ...permissions
          }
        };
      }

  


    buildJsonSchema(
    column
  ) {
    const dataType =
      String(
        column.dataType ||
        column.type ||
        column.nativeType ||
        ''
      )
        .trim()
        .toLowerCase();

    switch (dataType) {
      case 'uuid':
        return {
          type:
            'string',

          format:
            'uuid'
        };

      case 'boolean':
      case 'bool':
        return {
          type:
            'boolean'
        };

      case 'integer':
      case 'int':
      case 'int2':
      case 'int4':
      case 'smallint':
        return {
          type:
            'integer'
        };

      case 'bigint':
      case 'int8':
        return {
          type:
            'integer'
        };

      case 'numeric':
      case 'decimal':
      case 'real':
      case 'float':
      case 'float4':
      case 'float8':
      case 'double':
      case 'double precision':
        return {
          type:
            'number'
        };

      case 'json':
      case 'jsonb':
        return {
          type:
            'object'
        };

      case 'date':
        return {
          type:
            'string',

          format:
            'date'
        };

      case 'timestamp':
      case 'timestamptz':
      case 'timestamp without time zone':
      case 'timestamp with time zone':
        return {
          type:
            'string',

          format:
            'date-time'
        };

      default: {
        const jsonSchema = {
          type:
            'string'
        };

        const maxLength =
          column.maxLength ??
          column.length;

        if (
          Number.isInteger(
            maxLength
          )
        ) {
          jsonSchema.maxLength =
            maxLength;
        }

        return jsonSchema;
      }
    }
  }
}

module.exports =
  GeneratorContextBuilder;
