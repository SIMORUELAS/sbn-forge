'use strict';

const path = require('path');
const { spawn } = require('child_process');

class ScaffoldRunner {
  constructor(options = {}) {
    this.spawn = options.spawn || spawn;
    this.rootDirectory = options.rootDirectory;
    this.nodeExecutable = options.nodeExecutable || process.execPath;
    this.npmExecutable = options.npmExecutable || (
      process.platform === 'win32' ? 'npm.cmd' : 'npm'
    );
  }

  getCliFile() {
    return path.join(
      this.rootDirectory,
      'bin',
      'sbn-forge.js'
    );
  }

  async inspectPostgreSql(options, paths) {
    const argumentsList = [
      this.getCliFile(),
      'inspect',
      'postgresql',
      options.table,
      '--schema',
      options.schema,
      '--output',
      paths.definitionFile,
      '--host',
      options.host,
      '--port',
      String(options.port),
      '--database',
      options.database,
      '--user',
      options.user,
      '--password',
      options.password
    ];

    if (options.quiet) {
      argumentsList.push('--quiet');
    }

    return this.runCommand(this.nodeExecutable, argumentsList, {
      cwd: this.rootDirectory,
      quiet: options.quiet,
      errorMessage: 'Falló la inspección PostgreSQL.'
    });
  }


  async generateModule(
      options,
      paths
    ) {
      const argumentsList = [
        this.getCliFile(),

        'generate',
        'api',

        options.table,

        '--profile',
        options.profile,

        '--definition',
        paths.definitionFile,

        '--output',
        paths.outputDirectory,

        '--framework',
        options.framework,

        '--module-root',
        options.moduleRoot,

        '--api-prefix',
        options.apiPrefix,

        '--route-prefix',
        options.routePrefix
      ];

      if (
        options.force
      ) {
        argumentsList.push(
          '--force'
        );
      }

      if (
        options.quiet
      ) {
        argumentsList.push(
          '--quiet'
        );
      }

      return this.runCommand(
        this.nodeExecutable,
        argumentsList,
        {
          cwd:
            this.rootDirectory,

          quiet:
            options.quiet,

          errorMessage:
            'Falló la generación del módulo.'
        }
      );
    }


  async runNpmCommand(argumentsList, options) {
    return this.runCommand(this.npmExecutable, argumentsList, {
      cwd: this.rootDirectory,
      quiet: options.quiet,
      errorMessage: `Falló npm ${argumentsList.join(' ')}.`
    });
  }

  runCommand(command, argumentsList, options = {}) {
    return new Promise((resolve, reject) => {
      const quiet = options.quiet === true;
      const useShell = process.platform === 'win32' && /\.cmd$/i.test(command);

      const child = this.spawn(command, argumentsList, {
        cwd: options.cwd || this.rootDirectory,
        env: {
          ...process.env
        },
        shell: useShell,
        stdio: quiet
          ? ['ignore', 'pipe', 'pipe']
          : 'inherit'
      });

      let standardOutput = '';
      let standardError = '';

      if (quiet) {
        child.stdout?.on('data', chunk => {
          standardOutput += chunk.toString();
        });

        child.stderr?.on('data', chunk => {
          standardError += chunk.toString();
        });
      }

      child.on('error', error => {
        reject(new Error(
          `${options.errorMessage || 'Falló el comando.'} ${error.message}`
        ));
      });

      child.on('close', exitCode => {
        if (exitCode === 0) {
          resolve({
            exitCode,
            standardOutput,
            standardError
          });
          return;
        }

        const details = standardError.trim() || standardOutput.trim();
        reject(new Error([
          options.errorMessage || 'El comando terminó con error.',
          `Código de salida: ${exitCode}.`,
          details
        ].filter(Boolean).join(' ')));
      });
    });
  }
}

module.exports = ScaffoldRunner;
