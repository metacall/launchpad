import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { after, afterEach, before, describe, test } from 'node:test';
import { Server } from 'node:http';
import { createApp } from '../server';
import { FakeFaas, startFakeFaas, stop } from './fake-faas';

const INDEX_HTML = '<!doctype html><html><body><div id="root"></div></body></html>';
const APP_JS = 'console.log("dashboard");';

describe('launchpad server', () => {
  let publicDir: string;
  let server: Server;
  let base: string;

  const get = (path: string, accept = '*/*') => fetch(base + path, { headers: { Accept: accept } });

  before(async () => {
    publicDir = mkdtempSync(join(tmpdir(), 'launchpad-public-'));
    mkdirSync(join(publicDir, 'assets'));
    writeFileSync(join(publicDir, 'index.html'), INDEX_HTML);
    writeFileSync(join(publicDir, 'assets', 'index-abc123.js'), APP_JS);

    server = createApp({ port: 9001, publicDir }).listen(0);
    await new Promise<void>(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(() => {
    server.close();
    rmSync(publicDir, { recursive: true, force: true });
  });

  test('GET /__launchpad/config answers JSON in local mode, with its own origin as faasUrl', async () => {
    const res = await get('/__launchpad/config', 'application/json');

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /^application\/json/);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await res.json(), {
      faasUrl: 'http://localhost:9001',
      token: 'local',
      mode: 'local',
    });
  });

  for (const path of ['/', '/deployments', '/deployments/x/logs']) {
    test(`GET ${path} from a browser serves index.html`, async () => {
      const res = await get(path, 'text/html,application/xhtml+xml,*/*;q=0.8');

      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') ?? '', /^text\/html/);
      assert.equal(await res.text(), INDEX_HTML);
    });
  }

  test('GET an existing asset serves the file with a JavaScript content type', async () => {
    const res = await get('/assets/index-abc123.js');

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /javascript/);
    assert.equal(await res.text(), APP_JS);
  });

  test('GET a missing asset is a 404, not index.html', async () => {
    const res = await get('/assets/missing.js');

    assert.equal(res.status, 404);
    assert.notEqual(await res.text(), INDEX_HTML);
  });

  test('a relative publicDir still serves index.html for page loads', async () => {
    const app = createApp({ port: 9001, publicDir: relative(process.cwd(), publicDir) });
    const relativeServer = app.listen(0);
    await new Promise<void>(resolve => relativeServer.once('listening', resolve));
    const url = `http://127.0.0.1:${(relativeServer.address() as AddressInfo).port}/deployments`;

    try {
      const res = await fetch(url, { headers: { Accept: 'text/html' } });

      assert.equal(res.status, 200);
      assert.equal(await res.text(), INDEX_HTML);
    } finally {
      relativeServer.close();
    }
  });

  test('a missing dashboard bundle answers with a hint, not a stack trace', async () => {
    const app = createApp({ port: 9001, publicDir: join(publicDir, 'missing') });
    const missingServer = app.listen(0);
    await new Promise<void>(resolve => missingServer.once('listening', resolve));
    const url = `http://127.0.0.1:${(missingServer.address() as AddressInfo).port}/`;

    try {
      const res = await fetch(url, { headers: { Accept: 'text/html' } });
      const body = await res.text();

      assert.equal(res.status, 500);
      assert.match(body, /npm run build/);
      assert.doesNotMatch(body, /ENOENT|\s+at /);
    } finally {
      missingServer.close();
    }
  });

  describe('forwarding to FaaS', { timeout: 10_000 }, () => {
    let faas: FakeFaas;
    let forwardingServer: Server;
    let forwardingBase: string;

    before(async () => {
      faas = await startFakeFaas();
      forwardingServer = createApp({ port: 9001, publicDir, faasUrl: new URL(faas.url) }).listen(0);
      await new Promise<void>(resolve => forwardingServer.once('listening', resolve));
      forwardingBase = `http://127.0.0.1:${(forwardingServer.address() as AddressInfo).port}`;
    });

    afterEach(() => {
      faas.requests.length = 0;
    });

    after(async () => {
      await stop(forwardingServer);
      await faas.close();
    });

    for (const path of [
      '/api/inspect',
      '/api/billing/list-subscriptions',
      '/validate',
      '/my-host/app/v1/call/sum',
    ]) {
      test(`GET ${path} is forwarded to FaaS, even from a browser`, async () => {
        const res = await fetch(forwardingBase + path, { headers: { Accept: 'text/html' } });

        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), { method: 'GET', url: path });
        assert.equal(faas.requests.length, 1);
      });
    }

    test('a function call is forwarded with its JSON arguments', async () => {
      const res = await fetch(`${forwardingBase}/my-host/app/v1/call/sum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '[3,4]',
      });

      assert.deepEqual(await res.json(), { method: 'POST', url: '/my-host/app/v1/call/sum' });
      assert.equal(faas.requests[0].headers['content-type'], 'application/json');
      assert.equal(faas.requests[0].body.toString(), '[3,4]');
    });

    for (const path of [
      '/__launchpad/config',
      '/',
      '/deployments/x/logs',
      '/assets/index-abc123.js',
      '/my-host/app/v1/other/sum',
      '/my-host/app/v1/static/.metacall/faas/apps/app/index.html',
    ]) {
      test(`GET ${path} stays in Launchpad`, async () => {
        await fetch(forwardingBase + path, { headers: { Accept: 'text/html' } });

        assert.equal(faas.requests.length, 0);
      });
    }
  });
});
