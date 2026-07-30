'use strict';

const {
  Command
} = require('commander');

const pkg = require('../../package.json');

const {
  registerGenerateApiCommand
} = require(
  './commands/generate-api.command'
);

const {
  registerInspectPostgresqlCommand
} = require(
  './commands/inspect-postgresql.command'
);

async function runCli(
  argv = process.argv
) {
  const program = new Command();

  program
    .name('sbn-forge')
    .description(
      'La forja oficial de software de la SBN'
    )
    .version(pkg.version);

  const generate = program
    .command('generate')
    .description(
      'Genera capacidades SBN'
    );

  registerGenerateApiCommand(generate);

  const inspect = program
    .command('inspect')
    .description(
      'Inspecciona estructuras de datos'
    );

  registerInspectPostgresqlCommand(
    inspect
  );

  program.showHelpAfterError();

  await program.parseAsync(argv);
}

module.exports = {
  runCli
};