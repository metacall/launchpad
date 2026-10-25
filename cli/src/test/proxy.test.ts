import assert from 'node:assert/strict';
import { request, Server } from 'node:http';
import { AddressInfo, createServer } from 'node:net';
import { after, afterEach, before, describe, test } from 'node:test';
import express from 'express';
import { forward } from '../proxy';
import { closedUrl, FakeFaas, startFakeFaas, stop } from './fake-faas';

/** An app that forwards every request, so these tests only cover forward() itself. */
async function startForwarder(faasUrl: string): Promise<{ base: string; server: Server }> {
  const app = express();
  const target = new URL(faasUrl);
  app.use((req, res) => forward(req, res, target));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server };
}

describe('forward', { timeout: 10_000 }, () => {
  let faas: FakeFaas;
  let forwarder: { base: string; server: Server };
  let downUrl: string;
  let toDownFaas: { base: string; server: Server };
  let slowRequestClosed: Promise<void>;

  before(async () => {
    faas = await startFakeFaas((req, res) => {
      if (req.url === '/api/fails') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end('{"error":"Something broke"}');
        return;
      }
      if (req.url === '/api/dies') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('part of the');
        setTimeout(() => res.socket?.destroy(), 20);
        return;
      }
      if (req.url === '/api/resets') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('part of the');
        setTimeout(() => res.socket?.resetAndDestroy(), 20);
        return;
      }
      if (req.url === '/api/slow') {
        // Never answers, like a long deploy
        slowRequestClosed = new Promise(resolve => res.on('close', resolve));
        return;
      }
      res.writeHead(201, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Faas': 'yes' });
      res.end('created');
    });
    forwarder = await startForwarder(faas.url);
    downUrl = await closedUrl();
    toDownFaas = await startForwarder(downUrl);
  });

  afterEach(() => {
    faas.requests.length = 0;
  });

  after(async () => {
    await stop(forwarder.server);
    await stop(toDownFaas.server);
    await faas.close();
  });

  test('relays the status, headers and body from FaaS', async () => {
    const res = await fetch(`${forwarder.base}/api/inspect`);

    assert.equal(res.status, 201);
    assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(res.headers.get('x-faas'), 'yes');
    assert.equal(await res.text(), 'created');
  });

  test('relays FaaS errors as they are', async () => {
    const res = await fetch(`${forwarder.base}/api/fails`);

    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'Something broke' });
  });

  test('keeps the method, path and query string', async () => {
    await fetch(`${forwarder.base}/api/deploy/logs?a=1&b=two%20words`, { method: 'POST' });

    assert.equal(faas.requests.length, 1);
    assert.equal(faas.requests[0].method, 'POST');
    assert.equal(faas.requests[0].url, '/api/deploy/logs?a=1&b=two%20words');
  });

  test('passes a multipart upload through byte for byte', async () => {
    const boundary = '----launchpad-test-boundary';
    const zip = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="id"\r\n\r\napp\r\n` +
          `--${boundary}\r\nContent-Disposition: form-data; name="raw"; filename="app.zip"\r\n` +
          'Content-Type: application/zip\r\n\r\n',
      ),
      zip,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    await fetch(`${forwarder.base}/api/package/create`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer local',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    const received = faas.requests[0];
    assert.equal(received.headers['content-type'], `multipart/form-data; boundary=${boundary}`);
    assert.equal(received.headers.authorization, 'Bearer local');
    assert.ok(received.body.equals(body), 'FaaS got different bytes than were sent');
  });

  test('sets Host to FaaS and drops hop-by-hop headers', async () => {
    // fetch() doesn't allow setting Connection or Keep-Alive, so use http.request
    await new Promise<void>((resolve, reject) => {
      const req = request(`${forwarder.base}/api/inspect`, {
        headers: {
          Connection: 'keep-alive, X-Hop',
          'Keep-Alive': 'timeout=5',
          'X-Hop': 'only for this connection',
          'Proxy-Authorization': 'Basic not-for-faas',
          'X-End-To-End': 'kept',
        },
      });
      req.on('response', res => res.resume().on('end', resolve));
      req.on('error', reject);
      req.end();
    });

    const { headers } = faas.requests[0];
    assert.equal(headers.host, new URL(faas.url).host);
    assert.equal(headers['keep-alive'], undefined);
    assert.equal(headers['x-hop'], undefined);
    assert.equal(headers['proxy-authorization'], undefined);
    assert.equal(headers['x-end-to-end'], 'kept');
  });

  test('breaks the response when FaaS dies halfway, instead of ending it cleanly', async () => {
    const res = await fetch(`${forwarder.base}/api/dies`);

    assert.equal(res.status, 200);
    await assert.rejects(res.text());
  });

  test('survives FaaS resetting the connection halfway, and keeps serving', async () => {
    const res = await fetch(`${forwarder.base}/api/resets`);

    assert.equal(res.status, 200);
    await assert.rejects(res.text());
    assert.equal((await fetch(`${forwarder.base}/api/inspect`)).status, 201);
  });

  test('closes the request to FaaS when the browser gives up', async () => {
    const controller = new AbortController();
    const pending = fetch(`${forwarder.base}/api/slow`, { signal: controller.signal });
    while (faas.requests.length === 0) await new Promise(resolve => setTimeout(resolve, 10));

    controller.abort();

    await assert.rejects(pending);
    await slowRequestClosed;
  });

  test('answers 502 with JSON when FaaS is not reachable, and keeps serving', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await fetch(`${toDownFaas.base}/api/inspect`);

      assert.equal(res.status, 502);
      assert.match(res.headers.get('content-type') ?? '', /^application\/json/);
      assert.deepEqual(await res.json(), { error: `No response from FaaS at ${downUrl}` });
    }
  });

  test('reaches FaaS at an IPv6 address', async t => {
    let ipv6Faas: FakeFaas;
    try {
      ipv6Faas = await startFakeFaas(undefined, '::1');
    } catch {
      t.skip('this machine has no IPv6 loopback');
      return;
    }
    const toIpv6Faas = await startForwarder(ipv6Faas.url);

    try {
      const res = await fetch(`${toIpv6Faas.base}/api/inspect`);

      assert.deepEqual(await res.json(), { method: 'GET', url: '/api/inspect' });
    } finally {
      await stop(toIpv6Faas.server);
      await ipv6Faas.close();
    }
  });

  test('talks TLS to an https FaaS URL', async () => {
    // No certificate needed: it's enough to see the TLS handshake start
    let gotFirstByte: (byte: number) => void = () => {};
    const firstByte = new Promise<number>(resolve => (gotFirstByte = resolve));
    const tlsServer = createServer(socket =>
      socket.once('data', data => {
        gotFirstByte(data[0]);
        socket.destroy();
      }),
    );
    tlsServer.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => tlsServer.once('listening', resolve));
    const { port } = tlsServer.address() as AddressInfo;
    const toHttpsFaas = await startForwarder(`https://127.0.0.1:${port}`);

    try {
      const res = await fetch(`${toHttpsFaas.base}/api/inspect`);

      assert.equal(res.status, 502);
      // 0x16 starts a TLS handshake record (the ClientHello)
      assert.equal(await firstByte, 0x16);
    } finally {
      await stop(toHttpsFaas.server);
      await new Promise<void>(resolve => tlsServer.close(() => resolve()));
    }
  });
});
