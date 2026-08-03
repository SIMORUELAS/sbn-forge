'use strict';

const {
  Command
} = require(
  'commander'
);

const registerPostgreSqlScaffoldCommand =
  require(
    './scaffold-postgresql.command'
  );

function registerScaffoldCommand(
  program
) {

  const scaffoldCommand =
    new Command(
      'scaffold'
    );

  scaffoldCommand
    .description(
      'Scaffold completo de módulos.'
    );

  registerPostgreSqlScaffoldCommand(
    scaffoldCommand
  );

  program.addCommand(
    scaffoldCommand
  );

}

module.exports =
  registerScaffoldCommand;