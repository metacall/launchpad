import assert from 'node:assert/strict';
import { ChildProcessWithoutNullStreams, spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { networkInterfaces, tmpdir } from 'node:os';
import { AddressInfo, createServer } from 'node:net';
import { join } from 'node:path';
import { after, afterEach, before, describe, test } from 'node:test';
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

  test('only listens on the loopback address', async t => {
    const lan = Object.values(networkInterfaces())
      .flat()
      .find(address => address?.family === 'IPv4' && !address.internal)?.address;
    if (!lan) {
      t.skip('this machine has no network address besides loopback');
      return;
    }
    const port = await freePort();
    const launchpad = start(['--no-open', '--port', port, '--faas-url', await closedUrl()]);
    await launchpad.waitFor(/running at/);

    assert.equal((await fetch(`http://127.0.0.1:${port}/__launchpad/config`)).status, 200);
    await assert.rejects(fetch(`http://${lan}:${port}/__launchpad/config`));
  });

  test('explains a busy port and exits 1', async () => {
    const taken = createServer().listen(0, '127.0.0.1');
    await new Promise<void>(resolve => taken.once('listening', resolve));
    const port = String((taken.address() as AddressInfo).port);
    try {
      const launchpad = start(['--no-open', '--port', port]);

      assert.equal(await launchpad.exited, 1);
      assert.match(launchpad.stderr(), new RegExp(`Port ${port} is already in use.*--port`));
    } finally {
      await new Promise<void>(resolve => taken.close(() => resolve()));
    }
  });

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    test(`exits 0 on ${signal}, even with a request still waiting on FaaS`, async () => {
      // A FaaS that never answers, like a long deploy
      const faas = await startFakeFaas(() => {});
      const port = await freePort();
      const launchpad = start(['--no-open', '--port', port, '--faas-url', faas.url]);
      try {
        await launchpad.waitFor(/running at/);
        const cutOff = assert.rejects(
          fetch(`http://127.0.0.1:${port}/api/deploy/create`, { method: 'POST' }),
        );
        while (faas.requests.length < 2) await new Promise(resolve => setTimeout(resolve, 20));

        launchpad.child.kill(signal);

        assert.equal(await launchpad.exited, 0);
        await cutOff;
      } finally {
        await faas.close();
      }
    });
  }

  describe(
    'opening the browser',
    { skip: process.platform !== 'linux' && 'needs xdg-open' },
    () => {
      let bin: string;
      let opened: string;
      let env: NodeJS.ProcessEnv;

      before(() => {
        // A fake xdg-open that writes down the URL it was asked to open
        bin = mkdtempSync(join(tmpdir(), 'launchpad-bin-'));
        opened = join(bin, 'opened.txt');
        writeFileSync(join(bin, 'xdg-open'), `#!/bin/sh\necho "$1" > "${opened}"\n`);
        chmodSync(join(bin, 'xdg-open'), 0o755);
        env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
      });

      afterEach(() => rmSync(opened, { force: true }));

      after(() => rmSync(bin, { recursive: true, force: true }));

      test('opens the dashboard URL', async () => {
        const port = await freePort();
        start(['--port', port, '--faas-url', await closedUrl()], env);

        while (!existsSync(opened)) await new Promise(resolve => setTimeout(resolve, 20));
        // The file can exist before echo has written to it
        while (readFileSync(opened, 'utf8') === '') await new Promise(r => setTimeout(r, 20));
        assert.equal(readFileSync(opened, 'utf8').trim(), `http://localhost:${port}`);
      });

      test("doesn't open anything with --no-open", async () => {
        const launchpad = start(['--no-open', '--port', await freePort()], env);

        await launchpad.waitFor(/running at/);
        await new Promise(resolve => setTimeout(resolve, 300));
        assert.equal(existsSync(opened), false);
      });
    },
  );
});
