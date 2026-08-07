'use strict';

const {
  Command
} = require(
  'commander'
);

const registerConfigShowCommand =
  require(
    './config-show.command'
  );

const registerConfigTestCommand =
  require(
    './config-test.command'
  );

function registerConfigCommand(
  parentCommand
) {
  const command =
    new Command(
      'config'
    );

  command
    .description(
      'Administra y valida la configuración de SBN Forge.'
    );

  registerConfigShowCommand(
    command
  );

  registerConfigTestCommand(
    command
  );

  parentCommand.addCommand(
    command
  );
}

module.exports =
  registerConfigCommand;