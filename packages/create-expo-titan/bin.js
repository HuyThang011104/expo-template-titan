#!/usr/bin/env node
const { run } = require("./src/index");

run(process.argv.slice(2)).catch((err) => {
  process.stderr.write(`create-expo-titan: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
});
