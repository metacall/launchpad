#!/usr/bin/env node

import { HELP, Options, parseOptions, UsageError } from './args';
import { createApp } from './server';
import { printVersionAndExit } from './version';

let options: Options;
try {
  options = parseOptions(process.argv.slice(2));
} catch (err) {
  if (!(err instanceof UsageError)) throw err;
  console.error(`${err.message}\nRun with --help to see the options.`);
  process.exit(1);
}

if (options.help) {
  console.log(HELP);
  process.exit(0);
}
if (options.version) {
  printVersionAndExit();
}

const { port, faasUrl } = options;
createApp({ port, faasUrl }).listen(port, () => {
  console.log(`MetaCall Launchpad is running at http://localhost:${port}`);
});
