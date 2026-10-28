import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { isFaasReady } from '../probe';
import { closedUrl, FakeFaas, startFakeFaas } from './fake-faas';

describe('isFaasReady', { timeout: 10_000 }, () => {
  let faas: FakeFaas;
  let failingFaas: FakeFaas;
  let silentFaas: FakeFaas;

  before(async () => {
    faas = await startFakeFaas((_req, res) => res.end());
    failingFaas = await startFakeFaas((_req, res) => res.writeHead(500).end());
    silentFaas = await startFakeFaas(() => {});
  });

  after(async () => {
    await faas.close();
    await failingFaas.close();
    await silentFaas.close();
  });

  test('is true when FaaS answers /api/readiness with 200', async () => {
    assert.equal(await isFaasReady(new URL(faas.url)), true);
    assert.equal(faas.requests[0].method, 'GET');
    assert.equal(faas.requests[0].url, '/api/readiness');
  });

  test('is false when nothing listens at the FaaS URL', async () => {
    assert.equal(await isFaasReady(new URL(await closedUrl())), false);
  });

  test('is false when FaaS answers with an error', async () => {
    assert.equal(await isFaasReady(new URL(failingFaas.url)), false);
  });

  test('is false, not stuck, when FaaS never answers', async () => {
    const started = Date.now();

    assert.equal(await isFaasReady(new URL(silentFaas.url), 100), false);
    assert.ok(Date.now() - started < 2000, 'waited for much longer than the timeout');
  });
});
