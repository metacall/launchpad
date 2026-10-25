import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const entry = join(__dirname, '..', 'index.js');

/** Run the command line tool to the end, the way a user would. */
const run = (...args: string[]) =>
  spawnSync(process.execPath, [entry, ...args], { encoding: 'utf8', timeout: 10_000 });

describe('metacall launchpad', { timeout: 10_000 }, () => {
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
});
