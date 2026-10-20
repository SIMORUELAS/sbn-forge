'use strict';

/**
 * Convierte un tipo PostgreSQL en una propiedad JSON Schema.
 *
 * @param {object} column
 * @returns {object}
 */
function mapPostgresType(column) {
  const type = String(column.type || '')
    .trim()
    .toLowerCase();

  switch (type) {
    case 'uuid':
      return {
        type: 'string',
        format: 'uuid'
      };

    case 'smallint':
      return {
        type: 'integer',
        minimum: -32768,
        maximum: 32767
      };

    case 'integer':
    case 'int':
    case 'bigint':
      return {
        type: 'integer'
      };

    case 'numeric':
    case 'decimal':
    case 'real':
    case 'double precision':
      return {
        type: 'number'
      };

    case 'boolean':
      return {
        type: 'boolean'
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
    case 'timestamp without time zone':
    case 'timestamptz':
    case 'timestamp with time zone':
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

/**
 * Construye la propiedad completa de JSON Schema.
 *
 * Además del tipo, agrega maxLength cuando la columna
 * es string y tiene una longitud máxima definida.
 *
 * @param {object} column
 * @returns {object}
 */
function buildJsonSchemaProperty(column) {
  const property = mapPostgresType(column);

const maxLength =
    column.maxLength ??
    column.length;

    if (
        property.type === 'string' &&
        Number.isInteger(maxLength) &&
        maxLength > 0
    ) {
        property.maxLength = maxLength;
    }
    if (column.minimum !== undefined) {
        property.minimum = column.minimum;
    }
    if (column.maximum !== undefined) {
        property.maximum = column.maximum;
    }
    if (Array.isArray(column.enum)) {
        property.enum = [...column.enum];
    }
    if (column.nullable === true) {
        property.nullable = true;
    }

      return property;
    }

module.exports = {
  mapPostgresType,
  buildJsonSchemaProperty
};
