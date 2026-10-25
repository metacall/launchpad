#!/usr/bin/env node

import { HELP, Options, parseOptions, UsageError } from './args';
import { openBrowser } from './open';
import { isFaasReady } from './probe';
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

const { port, faasUrl, open } = options;
// Loopback only: FaaS has no login in local mode, so nothing else should reach it
const server = createApp({ port, faasUrl }).listen(port, '127.0.0.1', async () => {
  const url = `http://localhost:${port}`;
  console.log(`MetaCall Launchpad is running at ${url}`);
  if (open) openBrowser(url);
  if (!(await isFaasReady(faasUrl))) {
    console.warn(`FaaS is not answering at ${faasUrl.origin}. Start it with: metacall faas`);
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Pick another one with --port <port>`);
  } else {
    console.error(`MetaCall Launchpad could not start: ${err.message}`);
  }
  process.exit(1);
});

// Ctrl+C, or a service manager stopping it
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // Don't wait for idle keep-alive connections or a long deploy to finish
    server.closeAllConnections();
  });
}
