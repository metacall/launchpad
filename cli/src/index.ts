#!/usr/bin/env node

import { spawn } from 'child_process';
import { createApp } from './server';
import { printVersionAndExit } from './version';

const DEFAULT_PORT = 9001;
const DEFAULT_FAAS_URL = 'http://localhost:9000';

const args = process.argv.slice(2);
if (args.includes('--version')) {
  printVersionAndExit();
}

function readOption(name: string, fallback: string): string {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`${name} requires a value.`);
    process.exit(1);
  }
  return value;
}

const port = Number.parseInt(readOption('--port', String(DEFAULT_PORT)), 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('--port must be an integer between 1 and 65535.');
  process.exit(1);
}

const faasUrl = readOption('--faas-url', process.env.METACALL_FAAS_URL ?? DEFAULT_FAAS_URL);
try {
  const parsed = new URL(faasUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
} catch {
  console.error('--faas-url must be an http(s) URL.');
  process.exit(1);
}

createApp({ port, faasUrl }).listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`MetaCall Launchpad is running at ${url}`);
  if (process.env.CI) return;
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
  } else {
    const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(command, [url], { detached: true, stdio: 'ignore' }).unref();
  }
});
