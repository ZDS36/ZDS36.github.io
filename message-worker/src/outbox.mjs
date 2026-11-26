export const OUTBOX_PREFIX = 'outbox:';
const dueAt = key => Number(key.split(':', 2)[1]);
const firstPending = async tx => (await tx.list({ prefix: OUTBOX_PREFIX, limit: 1 })).entries().next().value;

export async function deliverNext(storage, send, now = Date.now()) {
  const pending = await storage.transaction(async tx => {
    const first = await firstPending(tx);
    if (!first || dueAt(first[0]) <= now) return first;
    await tx.setAlarm(dueAt(first[0]));
  });
  if (!pending) return;
  const [key, message] = pending;
  let delivered = false;
  try {
    await send(message);
    delivered = true;
  } catch { /* Retain the message and schedule another attempt. */ }
  await storage.transaction(async tx => {
    if (!delivered) {
      const attempts = message.attempts + 1;
      const nextAttempt = now + Math.min(3_600_000, 30_000 * 2 ** Math.min(attempts - 1, 7));
      await tx.put(`${OUTBOX_PREFIX}${nextAttempt}:${message.id}`, { ...message, attempts });
    }
    await tx.delete(key);
    const first = await firstPending(tx);
    if (first) await tx.setAlarm(Math.max(now + 1000, dueAt(first[0])));
  });
}
