#!/usr/bin/env node
'use strict';

const {
  runCli
} = require(
  '../src/cli'
);

runCli(
  process.argv
)
  .catch(
    error => {
      const message =
        error?.stack ||
        error?.message ||
        String(
          error
        );

      console.error(
        ''
      );

      console.error(
        'SBN Forge Error'
      );

      console.error(
        message
      );

      process.exitCode =
        1;
    }
  );