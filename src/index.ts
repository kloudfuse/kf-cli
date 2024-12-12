#!/usr/bin/env node

import { program } from "commander";

program
  .version("1.0.0")
  .description("My Node CLI")
  .option("-n, --name <type>", "Add your name")
  .action((options) => {
     process.stdout.write(`Hey, ${options.name}!`);
  });

program.parse(process.argv);
