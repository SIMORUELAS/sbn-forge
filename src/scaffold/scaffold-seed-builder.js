'use strict';

class ScaffoldSeedBuilder {
  build(
    definition
  ) {
    if (
      !definition ||
      !Array.isArray(
        definition.columns
      )
    ) {
      throw new TypeError(
        'La definición requiere columns.'
      );
    }

    const seed = {};

    for (
      const column of
      definition.columns
    ) {
      if (
        !this.shouldIncludeColumn(
          column
        )
      ) {
        continue;
      }

      seed[column.name] =
        this.buildExampleValue(
          column
        );
    }

    return [
      seed
    ];
  }

  shouldIncludeColumn(
    column
  ) {
    if (
      !column ||
      column.writable !== true
    ) {
      return false;
    }

    if (
      column.generated === true
    ) {
      return false;
    }

    return true;
  }

  buildExampleValue(
    column
  ) {
    /*
     * Si la columna tiene un valor por defecto,
     * Forge intenta convertirlo primero a un
     * valor válido para el seed.
     */
    if (
      column.hasDefault === true
    ) {
      return this.valueFromDefault(
        column
      );
    }

    const type =
      String(
        column.type || ''
      ).toLowerCase();

    /*
     * Las columnas JSON generan un objeto vacío,
     * aunque sean opcionales. Esto produce seeds
     * más útiles para documentación y pruebas.
     */
    if (
      type === 'json' ||
      type === 'jsonb'
    ) {
      return {};
    }

    /*
     * Las columnas terminadas en _code generan
     * un valor de ejemplo legible, aunque sean
     * opcionales.
     */
    if (
      (
        type.includes(
          'character'
        ) ||
        type === 'text'
      ) &&
      String(
        column.name || ''
      ).endsWith(
        '_code'
      )
    ) {
      return 'EXAMPLE-CODE';
    }

    /*
     * El resto de columnas opcionales debe
     * quedar como null. Esto evita generar
     * placeholders innecesarios para llaves
     * foráneas que no son obligatorias.
     */
    if (
      column.nullable === true
    ) {
      return null;
    }

    /*
     * Las llaves foráneas obligatorias generan
     * un placeholder basado en el nombre de la
     * tabla relacionada.
     */
    if (
      column.foreignKey
    ) {
      return this.buildForeignKeyPlaceholder(
        column
      );
    }

    /*
     * Los UUID obligatorios sin llave foránea
     * generan un placeholder basado en el nombre
     * de la propia columna.
     */
    if (
      type === 'uuid'
    ) {
      return this.buildColumnPlaceholder(
        column.name
      );
    }

    if (
      type.includes(
        'timestamp'
      ) ||
      type === 'date'
    ) {
      return '2026-01-01T00:00:00.000Z';
    }

    if (
      type === 'boolean'
    ) {
      return true;
    }

    if (
      type.includes(
        'integer'
      ) ||
      type === 'bigint' ||
      type === 'smallint' ||
      type === 'numeric' ||
      type === 'decimal'
    ) {
      return 1;
    }

    if (
      type.includes(
        'character'
      ) ||
      type === 'text'
    ) {
      return this.buildTextExample(
        column
      );
    }

    return null;
  }

  valueFromDefault(
    column
  ) {
    const value =
      String(
        column.default || ''
      ).trim();

    if (
      value === ''
    ) {
      return null;
    }

    if (
      value.toLowerCase() ===
        'true'
    ) {
      return true;
    }

    if (
      value.toLowerCase() ===
        'false'
    ) {
      return false;
    }

    if (
      /^-?\d+$/.test(
        value
      )
    ) {
      return Number(
        value
      );
    }

    if (
      /^-?\d+\.\d+$/.test(
        value
      )
    ) {
      return Number(
        value
      );
    }

    const quotedValue =
      value.match(
        /^'([^']*)'(?:::.*)?$/
      );

    if (
      quotedValue
    ) {
      return quotedValue[1];
    }

    if (
      value.toUpperCase() ===
        'CURRENT_TIMESTAMP'
    ) {
      return null;
    }

    if (
      value.toLowerCase().includes(
        'gen_random_uuid'
      ) ||
      value.toLowerCase().includes(
        'uuid_generate'
      )
    ) {
      return null;
    }

    return null;
  }

  buildForeignKeyPlaceholder(
    column
  ) {
    const foreignKey =
      column.foreignKey || {};

    const table =
      foreignKey.table ||
      column.name;

    return `{{${this.toConstantName(
      table
    )}_ID}}`;
  }

  buildColumnPlaceholder(
    name
  ) {
    return `{{${this.toConstantName(
      name
    )}}}`;
  }

  buildTextExample(
    column
  ) {
    const name =
      String(
        column.name || ''
      );

    if (
      name.endsWith(
        '_status'
      )
    ) {
      return 'active';
    }

    if (
      name.endsWith(
        '_code'
      )
    ) {
      return 'EXAMPLE-CODE';
    }

    return `example_${name}`;
  }

  toConstantName(
    value
  ) {
    return String(
      value || ''
    )
      .replace(
        /[^a-zA-Z0-9]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      )
      .toUpperCase();
  }
}

module.exports =
  ScaffoldSeedBuilder;