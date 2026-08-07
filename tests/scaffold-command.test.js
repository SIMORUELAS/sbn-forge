'use strict';

const {
  Command
} = require(
  'commander'
);

const registerScaffoldCommand =
  require(
    '../src/cli/commands/scaffold/scaffold.command'
  );

describe(
  'Scaffold Command',
  () => {
    test(
      'registra el comando scaffold',
      () => {
        const program =
          new Command();

        registerScaffoldCommand(
          program
        );

        const command =
          program.commands.find(
            item =>
              item.name() ===
              'scaffold'
          );

        expect(
          command
        ).toBeDefined();

        expect(
          command.name()
        ).toBe(
          'scaffold'
        );

        const tableArgument =
          command
            .registeredArguments[0];

        expect(
          tableArgument
        ).toBeDefined();

        expect(
          tableArgument.name()
        ).toBe(
          'table'
        );

        expect(
          tableArgument.required
        ).toBe(
          true
        );
      }
    );

    test(
      'expone las opciones de configuración',
      () => {
        const program =
          new Command();

        registerScaffoldCommand(
          program
        );

        const command =
          program.commands.find(
            item =>
              item.name() ===
              'scaffold'
          );

        const options =
          command.options.map(
            option =>
              option.long
          );

        expect(
          options
        ).toEqual(
          expect.arrayContaining([
            '--config',
            '--provider',
            '--schema',
            '--host',
            '--port',
            '--database',
            '--user',
            '--password',
            '--framework',
            '--module-root',
            '--api-prefix',
            '--route-prefix',
            '--profile',
            '--definitions-dir',
            '--output',
            '--force',
            '--test',
            '--lint',
            '--quiet'
          ])
        );
      }
    );
  }
);