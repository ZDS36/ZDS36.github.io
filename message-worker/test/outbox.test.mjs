import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverNext } from '../src/outbox.mjs';

test('a delayed retry retains its content and allows a later message to be delivered first', async () => {
  const now = 1_800_000_000_000;
  const first = `outbox:${now - 2}:a`;
  const second = `outbox:${now - 1}:b`;
  const records = new Map([
    [first, { id: 'a', message: 'First', attempts: 0 }],
    [second, { id: 'b', message: 'Second', attempts: 0 }]
  ]);
  let alarm;
  const storage = {
    list: async () => new Map([...records].sort(([a], [b]) => a.localeCompare(b)).slice(0, 1)),
    put: async (key, value) => records.set(key, value),
    delete: async key => records.delete(key),
    setAlarm: async time => { alarm = time; },
    transaction: fn => fn(storage)
  };
  await deliverNext(storage, async () => { throw Error('SMTP unavailable'); }, now);
  assert.equal(records.size, 2);
  assert.equal(records.get(`outbox:${now + 30_000}:a`).message, 'First');
  assert.equal(alarm, now + 1000);
  const sent = [];
  const send = async message => { sent.push(message.id); };
  await deliverNext(storage, send, now + 1000);
  assert.equal(records.has(second), false);
  assert.equal(alarm, now + 30_000);
  await deliverNext(storage, send, now + 2000);
  assert.deepEqual(sent, ['b']);
  await deliverNext(storage, async () => { throw Error('SMTP still unavailable'); }, now + 30_000);
  assert.equal(alarm, now + 90_000);
  await deliverNext(storage, send, now + 90_000);
  assert.equal(records.size, 0);
  assert.deepEqual(sent, ['b', 'a']);
});
