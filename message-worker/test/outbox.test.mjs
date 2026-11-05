import assert from 'node:assert/strict';
import test from 'node:test';
import { deliverNext } from '../src/outbox.mjs';

test('accepted messages survive mail failure, retry with backoff and are removed only after delivery', async () => {
  const records = new Map([
    ['outbox:1:a', { id: 'a', message: 'First', attempts: 0 }],
    ['outbox:2:b', { id: 'b', message: 'Second', attempts: 0 }]
  ]);
  let alarm;
  const storage = {
    list: async () => new Map([...records].slice(0, 1)),
    put: async (key, value) => records.set(key, value),
    delete: async key => records.delete(key),
    setAlarm: async time => { alarm = time; }
  };
  await deliverNext(storage, async () => { throw Error('SMTP unavailable'); }, 1000);
  assert.equal(records.size, 2);
  assert.equal(records.get('outbox:1:a').message, 'First');
  assert.equal(alarm, 31000);
  await deliverNext(storage, async () => { throw Error('SMTP still unavailable'); }, 31000);
  assert.equal(alarm, 91000);
  const sent = [];
  await deliverNext(storage, async message => { sent.push(message.id); }, 91000);
  assert.equal(records.has('outbox:1:a'), false);
  assert.equal(alarm, 92000);
  await deliverNext(storage, async message => { sent.push(message.id); }, 92000);
  assert.equal(records.size, 0);
  assert.deepEqual(sent, ['a', 'b']);
});
