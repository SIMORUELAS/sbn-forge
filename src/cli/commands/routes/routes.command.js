'use strict';

const {
  Command
} = require(
  'commander'
);

const registerRoutesBuildCommand =
  require(
    './routes-build.command'
  );

function registerRoutesCommand(
  parentCommand
) {
  const command =
    new Command(
      'routes'
    );

  command
    .description(
      'Administra el registro global de rutas de SBN Forge.'
    );

  registerRoutesBuildCommand(
    command
  );

  parentCommand.addCommand(
    command
  );
}

module.exports =
  registerRoutesCommand;