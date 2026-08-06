'use strict';

const path = require('path');

function normalizeRequiredString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value, fallback) {
  const normalized = normalizeRequiredString(value);
  return normalized || fallback;
}

function resolveProjectPath(rootDirectory, value) {
  if (path.isAbsolute(value)) {
    return path.resolve(value);
  }

  return path.resolve(rootDirectory, value);
}

function toKebabCase(value) {
  return String(value)
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

module.exports = {
  normalizeOptionalString,
  normalizeRequiredString,
  resolveProjectPath,
  toKebabCase
};
