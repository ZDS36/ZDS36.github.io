import assert from 'node:assert/strict';
import { createTestHarness } from 'wrangler';

const runtime = createTestHarness({ workers: [{ configPath: './wrangler.site-stats.jsonc' }] });
try {
  await runtime.listen();
  const worker = runtime.getWorker();
  const origin = 'https://zds36.github.io';
  const ip = '192.0.2.10';
  const endpoint = 'https://stats.example/site-stats';
  const read = async () => {
    const response = await worker.fetch(endpoint, { headers: { 'CF-Connecting-IP': ip } });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
    return (await response.json()).total;
  };
  const record = (event, from = origin, client = ip) => worker.fetch(`${endpoint}?event=${event}`, {
    method: 'POST', headers: { Origin: from, 'CF-Connecting-IP': client }
  });
  const startingTotal = await read();
  assert.equal(startingTotal, (await worker.getEnv()).HISTORICAL_CLICKS);
  assert.equal((await record('click', 'https://other.example')).status, 403);
  assert.equal((await record('invalid')).status, 400);
  assert.equal((await record('view&event=click')).status, 400);
  assert.equal(await read(), startingTotal);

  const responses = await Promise.all(Array.from({ length: 20 }, (_, index) => record(index % 2 ? 'click' : 'view')));
  assert(responses.every(response => response.ok));
  const totals = await Promise.all(responses.map(async response => (await response.json()).total));
  assert.deepEqual(totals.sort((a, b) => a - b), Array.from({ length: 20 }, (_, index) => startingTotal + index + 1));
  await worker.evictDurableObject('SiteStats', { name: 'site-clicks' });
  assert.equal(await read(), startingTotal + 20);
  const limitedIp = '192.0.2.30';
  const limiter = (await worker.getEnv()).SITE_STATS_LIMIT;
  for (let index = 0; index < 90; index++) await limiter.limit({ key: `POST:${limitedIp}` });
  const throttled = await record('click', origin, limitedIp);
  assert.equal(throttled.status, 429);
  assert.equal(throttled.headers.get('Retry-After'), '60');
  assert.equal(await read(), startingTotal + 20);
  console.log('Passed: origin and event checks, shared concurrent increments, and durable total after eviction.');
} finally { await runtime.close(); }
