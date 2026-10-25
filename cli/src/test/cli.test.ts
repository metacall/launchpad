import assert from 'node:assert/strict';
import { ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { afterEach, describe, test } from 'node:test';
import { closedUrl, startFakeFaas } from './fake-faas';

const entry = join(__dirname, '..', 'index.js');

/** Run the command line tool to the end, the way a user would. */
const run = (...args: string[]) =>
  spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', timeout: 10_000 });

interface Launchpad {
  child: ChildProcessWithoutNullStreams;
  stdout: () => string;
  stderr: () => string;
  /** Wait until the output matches, or fail if Launchpad exits first. */
  waitFor: (pattern: RegExp, stream?: 'stdout' | 'stderr') => Promise<void>;
  exited: Promise<number | null>;
}

const running: Launchpad[] = [];

/** Start the command line tool and leave it running. */
function start(args: string[], env = process.env): Launchpad {
  const child = spawn(process.execPath, [entry, ...args], { env });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (data: string) => (stdout += data));
  child.stderr.setEncoding('utf8').on('data', (data: string) => (stderr += data));
  const exited = new Promise<number | null>(resolve => child.on('exit', code => resolve(code)));

  const launchpad: Launchpad = {
    child,
    stdout: () => stdout,
    stderr: () => stderr,
    exited,
    async waitFor(pattern, stream = 'stdout') {
      while (!pattern.test(stream === 'stdout' ? stdout : stderr)) {
        if (child.exitCode !== null) {
          throw new Error(`Launchpad exited before printing ${pattern}:\n${stdout}${stderr}`);
        }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    },
  };
  running.push(launchpad);
  return launchpad;
}

/** A port nothing listens on right now. */
const freePort = async () => new URL(await closedUrl()).port;

describe('metacall launchpad', { timeout: 10_000 }, () => {
  afterEach(() => {
    for (const { child } of running.splice(0)) child.kill('SIGKILL');
  });

  test('--help prints the options and exits 0', () => {
    const result = run('--help');

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Usage: metacall launchpad \[options\]/);
    for (const option of ['--port', '--faas-url', '--no-open', '--version', '--help']) {
      assert.match(result.stdout, new RegExp(`^  ${option}\\b`, 'm'));
    }
  });

  test('a wrong option exits 1 and says what was wrong', () => {
    const result = run('--port', 'abc');

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /--port must be a number from 1 to 65535, got "abc"/);
    assert.match(result.stderr, /--help/);
  });

  test('serves on --port and warns when FaaS is not answering', async () => {
    const port = await freePort();
    const faasUrl = await closedUrl();
    const launchpad = start(['--no-open', '--port', port, '--faas-url', faasUrl]);

    await launchpad.waitFor(new RegExp(`running at http://localhost:${port}\\b`));
    await launchpad.waitFor(
      new RegExp(`FaaS is not answering at ${faasUrl}\\. Start it with: metacall faas`),
      'stderr',
    );
    const res = await fetch(`http://127.0.0.1:${port}/__launchpad/config`);
    assert.equal(res.status, 200);
  });

  test('does not warn when FaaS answers', async () => {
    const faas = await startFakeFaas((_req, res) => res.end());
    try {
      const launchpad = start(['--no-open', '--port', await freePort(), '--faas-url', faas.url]);

      await launchpad.waitFor(/running at/);
      while (faas.requests.length === 0) await new Promise(resolve => setTimeout(resolve, 20));
      await new Promise(resolve => setTimeout(resolve, 100));
      assert.equal(launchpad.stderr(), '');
    } finally {
      await faas.close();
    }
  });
});
