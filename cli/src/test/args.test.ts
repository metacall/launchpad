import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseOptions, UsageError } from '../args';

describe('parseOptions', () => {
  test('defaults to port 9001, FaaS on localhost:9000, and opening the browser', () => {
    const options = parseOptions([]);

    assert.equal(options.port, 9001);
    assert.equal(options.faasUrl.href, 'http://localhost:9000/');
    assert.equal(options.open, true);
    assert.equal(options.help, false);
    assert.equal(options.version, false);
  });

  test('reads --port, --faas-url and --no-open', () => {
    const options = parseOptions([
      '--port',
      '8080',
      '--faas-url=https://faas.example.com:9443',
      '--no-open',
    ]);

    assert.equal(options.port, 8080);
    assert.equal(options.faasUrl.href, 'https://faas.example.com:9443/');
    assert.equal(options.open, false);
  });

  test('reads --help and --version', () => {
    assert.equal(parseOptions(['--help']).help, true);
    assert.equal(parseOptions(['--version']).version, true);
  });

  test('accepts an IPv6 FaaS URL and a trailing slash', () => {
    assert.equal(parseOptions(['--faas-url', 'http://[::1]:9000/']).faasUrl.hostname, '[::1]');
  });

  for (const port of ['0', '65536', '-1', '80.5', 'abc', '', '9001abc']) {
    test(`rejects --port ${JSON.stringify(port)}`, () => {
      assert.throws(
        () => parseOptions([`--port=${port}`]),
        (err: Error) =>
          err instanceof UsageError &&
          err.message.includes('--port must be a number from 1 to 65535'),
      );
    });
  }

  for (const url of [
    'localhost:9000',
    'ftp://localhost:9000',
    'http://localhost:9000/faas',
    'http://localhost:9000?x=1',
    'http://user:pass@localhost:9000',
    'not a url',
  ]) {
    test(`rejects --faas-url ${url}`, () => {
      assert.throws(
        () => parseOptions(['--faas-url', url]),
        (err: Error) =>
          err instanceof UsageError &&
          err.message.includes('--faas-url must be an http or https address'),
      );
    });
  }

  // Launchpad would forward to itself, again and again
  for (const args of [
    ['--port', '9000'],
    ['--faas-url', 'http://127.0.0.1:9001'],
    ['--faas-url', 'http://[::1]:9001'],
    ['--port', '80', '--faas-url', 'http://localhost'],
    ['--port', '443', '--faas-url', 'https://localhost'],
  ]) {
    test(`rejects ${args.join(' ')}, which points FaaS at Launchpad itself`, () => {
      assert.throws(
        () => parseOptions(args),
        (err: Error) =>
          err instanceof UsageError &&
          err.message.includes('--faas-url points at Launchpad itself'),
      );
    });
  }

  test('accepts the same port on another host', () => {
    const options = parseOptions(['--port', '9000', '--faas-url', 'http://faas.example.com:9000']);

    assert.equal(options.faasUrl.host, 'faas.example.com:9000');
    assert.ok(parseOptions(['--port', '9001', '--faas-url', 'http://127.example.com:9001']));
  });

  for (const [args, message] of [
    [['--prot', '1'], "Unknown option '--prot'"],
    [['--port'], "Option '--port <value>' argument missing"],
    [['extra'], "Unexpected argument 'extra'"],
  ] as const) {
    test(`rejects ${args.join(' ')} as a usage error`, () => {
      assert.throws(
        () => parseOptions([...args]),
        (err: Error) => err instanceof UsageError && err.message.includes(message),
      );
    });
  }
});
