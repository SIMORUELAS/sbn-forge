#!/usr/bin/env node
'use strict';

const { runCli } = require('../src/cli');

runCli(process.argv).catch((error) => {
  const message =
    error && error.message
      ? error.message
      : String(error);

  console.error(
    `SBN Forge error: ${message}`
  );

  process.exitCode = 1;
});