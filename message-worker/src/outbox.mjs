export async function deliverNext(storage, send, now = Date.now()) {
  const pending = await storage.list({ prefix: 'outbox:', limit: 1 });
  if (!pending.size) return;
  const [key, message] = pending.entries().next().value;
  try {
    await send(message);
    await storage.delete(key);
  } catch {
    const attempts = message.attempts + 1;
    await storage.put(key, { ...message, attempts });
    await storage.setAlarm(now + Math.min(3_600_000, 30_000 * 2 ** Math.min(attempts - 1, 7)));
    return;
  }
  if ((await storage.list({ prefix: 'outbox:', limit: 1 })).size) await storage.setAlarm(now + 1000);
}
