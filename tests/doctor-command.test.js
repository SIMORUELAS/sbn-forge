'use strict';

const {
  Command
} = require(
    'commander'
);

const registerDoctorCommand =
  require(
    '../src/cli/commands/doctor.command'
  );

describe(
  'Doctor Command',
  () => {
    test(
      'registra el comando doctor',
      () => {
        const program =
          new Command();

        registerDoctorCommand(
          program
        );

        const command =
          program.commands.find(
            item =>
              item.name() ===
              'doctor'
          );

        expect(
          command
        ).toBeDefined();

        expect(
          command.name()
        ).toBe(
          'doctor'
        );
      }
    );

    test(
      'expone la opción --config',
      () => {
        const program =
          new Command();

        registerDoctorCommand(
          program
        );

        const command =
          program.commands.find(
            item =>
              item.name() ===
              'doctor'
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