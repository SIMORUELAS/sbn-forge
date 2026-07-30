'use strict';

const genericProfile =
  require('./generic.profile');

const sbnApiV2Profile =
  require('./sbn-api-v2.profile');

const profiles = {
  generic:
    genericProfile,

  'sbn-api-v2':
    sbnApiV2Profile
};

/**
 * Obtiene un perfil de generación.
 *
 * @param {string} profileName
 * @returns {object}
 */
function resolveProfile(
  profileName = 'generic'
) {
  const normalizedProfileName =
    typeof profileName === 'string' &&
    profileName.trim() !== ''
      ? profileName.trim()
      : 'generic';

  const profile =
    profiles[
      normalizedProfileName
    ];

  if (!profile) {
    const error = new Error(
      `Perfil de generación no soportado: ${normalizedProfileName}`
    );

    error.code =
      'UNSUPPORTED_GENERATION_PROFILE';

    error.profile =
      normalizedProfileName;

    throw error;
  }

  return {
    ...profile,

    files: {
      ...(profile.files || {})
    },

    capabilities: {
      ...(profile.capabilities || {})
    },

    security: {
      ...(profile.security || {})
    }
  };
}

/**
 * Permite consultar los perfiles disponibles.
 *
 * @returns {string[]}
 */
function getAvailableProfiles() {
  return Object.keys(
    profiles
  );
}

/**
 * Indica si un perfil está registrado.
 *
 * @param {string} profileName
 * @returns {boolean}
 */
function hasProfile(profileName) {
  return Object.prototype.hasOwnProperty.call(
    profiles,
    profileName
  );
}

module.exports = {
  resolveProfile,
  getAvailableProfiles,
  hasProfile
};