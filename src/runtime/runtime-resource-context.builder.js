'use strict';

class RuntimeResourceContextBuilder {
  build(
    generatorContext = {}
  ) {
    this.validateContext(
      generatorContext
    );

    const {
      names,
      columns,
      primaryKey,
      capabilities,
      api
    } = generatorContext;

    const primaryKeyName =
      primaryKey.columns[0];

    return {
      name:
        names.module,

      code:
        names.permissionPrefix,

      label:
        this.buildLabel(
          names.module
        ),

      primaryKey:
        primaryKeyName,

      api:
        this.buildApi(
          api,
          capabilities
        ),

      ...this.buildOptimisticLock(
        capabilities
      ),

      fields:
        columns.map(
          column =>
            this.buildField(
              column,
              generatorContext.foreignKeys || []
            )
        ),

      views:
        this.buildViews(
          capabilities
        ),

      defaultTheme:
        'sbn-futuristic'
    };
  }

  validateContext(
    context
  ) {
    if (
      !context ||
      typeof context !==
        'object'
    ) {
      throw new TypeError(
        'RuntimeResourceContextBuilder requiere un GeneratorContext válido.'
      );
    }

    if (
      !context.names ||
      typeof context.names.module !==
        'string' ||
      context.names.module.trim() ===
        ''
    ) {
      throw new TypeError(
        'RuntimeResourceContextBuilder requiere names.module.'
      );
    }

    if (
      !Array.isArray(
        context.columns
      )
    ) {
      throw new TypeError(
        'RuntimeResourceContextBuilder requiere columns.'
      );
    }

    if (
      !Array.isArray(
        context.primaryKey?.columns
      ) ||
      context.primaryKey.columns.length ===
        0
    ) {
      throw new TypeError(
        'RuntimeResourceContextBuilder requiere una llave primaria.'
      );
    }

    if (
      typeof context.api?.basePath !==
        'string' ||
      context.api.basePath.trim() ===
        ''
    ) {
      throw new TypeError(
        'RuntimeResourceContextBuilder requiere api.basePath.'
      );
    }
  }

  buildOptimisticLock(
    capabilities = {}
  ) {
    if (
      capabilities.optimisticLock !==
        true
    ) {
      return {};
    }

    return {
      optimisticLock: {
        versionField:
          'version_no',

        expectedField:
          'expected_version_no'
      }
    };
  }

  buildApi(
    api,
    capabilities = {}
  ) {
    const basePath =
      api.basePath;

    const idPath =
      `${basePath}/:id`;

    const definition = {
      list: {
        path:
          basePath,

        method:
          'GET'
      },

      getById: {
        path:
          idPath,

        method:
          'GET'
      }
    };

    if (
      capabilities.crud ===
        true
    ) {
      definition.create = {
        path:
          basePath,

        method:
          'POST'
      };

      definition.update = {
        path:
          idPath,

        method:
          'PATCH'
      };

      definition.delete = {
        path:
          idPath,

        method:
          'DELETE'
      };
    }

    return definition;
  }

  buildField(
    column,
    foreignKeys = []
  ) {
    const foreignKey =
      foreignKeys.find(
        item =>
          (
            item.column ||
            item.localColumn
          ) ===
            column.name
      );

    const field = {
      name:
        column.name,

      label:
        this.buildLabel(
          column.name
        ),

      type:
        foreignKey
          ? 'lookup'
          : this.mapFieldType(
              column
            )
    };

    if (
      foreignKey?.referencedTable
    ) {
      field.lookupResource =
        this.toResourceName(
          foreignKey.referencedTable
        );
    }

    if (
      column.hasDefaultValue ===
        true &&
      column.defaultValue !==
        undefined &&
      column.defaultValue !==
        null
    ) {
      field.defaultValue =
        column.defaultValue;
    }

    if (
      column.writable ===
        false
    ) {
      field.readonly =
        true;
    }

    if (
      column.writable ===
        true &&
      column.nullable ===
        false &&
      column.hasDefaultValue !==
        true
    ) {
      field.required =
        true;
    }

    return field;
  }

  mapFieldType(
    column
  ) {
    const type =
      String(
        column.type ||
        column.dataType ||
        column.nativeType ||
        ''
      )
        .trim()
        .toLowerCase();

    switch (
      type
    ) {
      case 'uuid':
        return 'uuid';

      case 'boolean':
      case 'bool':
        return 'boolean';

      case 'smallint':
      case 'integer':
      case 'int':
      case 'int2':
      case 'int4':
      case 'bigint':
      case 'int8':
      case 'numeric':
      case 'decimal':
      case 'real':
      case 'float':
      case 'float4':
      case 'float8':
      case 'double':
      case 'double precision':
        return 'number';

      case 'json':
      case 'jsonb':
        return 'json';

      case 'date':
        return 'date';

      case 'timestamp':
      case 'timestamptz':
      case 'timestamp without time zone':
      case 'timestamp with time zone':
        return 'datetime';

      case 'text':
        return 'textarea';

      default:
        return 'text';
    }
  }

  buildViews(
    capabilities = {}
  ) {
    const views = [
      {
        type:
          'list'
      }
    ];

    if (
      capabilities.crud ===
        true
    ) {
      views.push({
        type:
          'form'
      });
    }

    views.push({
      type:
        'detail'
    });

    return views;
  }

  toResourceName(
    value
  ) {
    return String(
      value || ''
    )
      .trim()
      .replace(
        /_/g,
        '-'
      )
      .toLowerCase();
  }

  buildLabel(
    value
  ) {
    return String(
      value || ''
    )
      .replace(
        /[-_]+/g,
        ' '
      )
      .replace(
        /\b\w/g,
        character =>
          character.toUpperCase()
      )
      .trim();
  }
}

module.exports =
  RuntimeResourceContextBuilder;
