'use strict';

const {
  Command
} = require(
  'commander'
);

const registerConfigTestCommand =
  require(
    '../src/cli/commands/config/config-test.command'
  );

describe(
  'Config Test Command',
  () => {
    test(
      'registra el comando config test',
      () => {
        const parent =
          new Command(
            'config'
          );

        registerConfigTestCommand(
          parent
        );

        const command =
          parent.commands.find(
            item =>
              item.name() ===
              'test'
          );

        expect(
          command
        ).toBeDefined();

        expect(
          command.name()
        ).toBe(
          'test'
        );
      }
    );

    test(
      'expone la opción --config',
      () => {
        const parent =
          new Command(
            'config'
          );

        registerConfigTestCommand(
          parent
        );

        const command =
          parent.commands.find(
            item =>
              item.name() ===
              'test'
          );

        const options =
          command.options.map(
            option =>
              option.long
          );

        expect(
          options
        ).toContain(
          '--config'
        );
      }
    );
  }
);