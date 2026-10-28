import assert from 'node:assert/strict';
import { SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { describe, test } from 'node:test';
import { openBrowser, openCommand } from '../open';

const URL = 'http://localhost:9001';

/** Stands in for child_process.spawn and records how it was called. */
function fakeSpawn() {
  const calls: { command: string; args: string[]; options: SpawnOptions }[] = [];
  const child = Object.assign(new EventEmitter(), {
    unrefCalled: false,
    unref() {
      this.unrefCalled = true;
    },
  });
  const spawn = (command: string, args: string[], options: SpawnOptions) => {
    calls.push({ command, args, options });
    return child;
  };
  return { spawn, calls, child };
}

describe('openCommand', () => {
  test('uses xdg-open on Linux', () => {
    assert.deepEqual(openCommand(URL, 'linux'), ['xdg-open', [URL]]);
  });

  test('uses open on macOS', () => {
    assert.deepEqual(openCommand(URL, 'darwin'), ['open', [URL]]);
  });

  test('uses start through cmd on Windows, with an empty window title', () => {
    assert.deepEqual(openCommand(URL, 'win32'), ['cmd', ['/c', 'start', '""', URL]]);
  });
});

describe('openBrowser', () => {
  test("doesn't wait for the browser or tie it to Launchpad", () => {
    const { spawn, calls, child } = fakeSpawn();

    openBrowser(URL, 'linux', spawn);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].command, 'xdg-open');
    assert.equal(calls[0].options.detached, true);
    assert.equal(calls[0].options.stdio, 'ignore');
    assert.equal(child.unrefCalled, true);
  });

  test('passes the cmd arguments verbatim on Windows only', () => {
    const windows = fakeSpawn();
    const linux = fakeSpawn();

    openBrowser(URL, 'win32', windows.spawn);
    openBrowser(URL, 'linux', linux.spawn);

    assert.equal(windows.calls[0].options.windowsVerbatimArguments, true);
    assert.equal(linux.calls[0].options.windowsVerbatimArguments, false);
  });

  test('ignores a missing browser command', () => {
    const { spawn, child } = fakeSpawn();

    openBrowser(URL, 'linux', spawn);

    // An EventEmitter throws on an 'error' event that nobody listens to
    assert.doesNotThrow(() => child.emit('error', new Error('spawn xdg-open ENOENT')));
  });
});
