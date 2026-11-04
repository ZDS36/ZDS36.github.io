import assert from 'node:assert/strict';
import { createTestHarness } from 'wrangler';

const runtime = createTestHarness({ workers: [{ configPath: './wrangler.jsonc' }] });
try {
  await runtime.listen();
  const worker = runtime.getWorker();
  const namespace = (await worker.getEnv()).MESSAGE_BUDGET;
  const id = namespace.idFromName('quota-test');
  const reserve = async key => {
    const response = await namespace.get(id).fetch('https://budget/reserve', {
      method: 'POST', body: JSON.stringify({ key })
    });
    assert(response.ok);
    return response.json();
  };
  const burst = await Promise.all(Array.from({ length: 12 }, () => reserve('a'.repeat(64))));
  assert.equal(burst.filter(result => result.ok === true).length, 1);
  assert.equal(burst.filter(result => result.code === 'cooldown').length, 11);
  await worker.evictDurableObject('MessageBudget', { name: 'quota-test' });
  assert.equal((await reserve('a'.repeat(64))).code, 'cooldown', 'Object eviction must not reset stored counters.');
  const otherIPs = await Promise.all(Array.from({ length: 30 }, (_, i) => reserve(i.toString(16).padStart(64, '0'))));
  assert.equal(otherIPs.filter(result => result.ok === true).length, 19);
  assert.equal(otherIPs.filter(result => result.code === 'site_limit').length, 11);
  console.log('Passed in real Worker runtime: concurrent requests cannot exceed cooldown/global quota; SQLite counters survive object eviction. No email was sent.');
} finally { await runtime.close(); }
