const globals = require('globals');

module.exports = [
  {
    files: [
      '**/*.js'
    ],

    ignores: [
      'output/**',
      'output-*/**',
      'examples/generated/**',
      'coverage/**'
    ],

    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',

      globals: {
        ...globals.node,
        ...globals.jest
      }
    },

    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_'
        }
      ],

      'no-console':
        'off',

      'eqeqeq':
        'error',

      'curly':
        'error'
    }
  }
];