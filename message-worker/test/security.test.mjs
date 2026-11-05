import test from 'node:test';
import assert from 'node:assert/strict';
import { reserveQuota, SITE_DAILY_LIMIT } from '../src/quota.mjs';
import { handleMessage } from '../src/handler.mjs';

const now = Date.parse('2026-11-04T15:55:00Z');
const a = 'a'.repeat(64);

test('three per IP, cooldown, independent IP, Shanghai midnight, immutable state', () => {
  const first = reserveQuota(null, a, now).next;
  assert.equal(reserveQuota(first, a, now + 1).code, 'cooldown');
  const second = reserveQuota(first, a, now + 60_000).next;
  const third = reserveQuota(second, a, now + 120_000).next;
  assert.equal(reserveQuota(third, a, now + 180_000).code, 'daily_limit');
  assert.equal(reserveQuota(third, a, now + 180_000).retryAfter, 120);
  assert(reserveQuota(third, 'b'.repeat(64), now).next);
  assert.equal(reserveQuota(third, a, Date.parse('2026-11-04T16:00:00Z')).next.clients[a].count, 1);
  assert.equal(first.clients[a].count, 1);
});

test('site cap also blocks new IPs', () => {
  let state;
  for (let i = 0; i < SITE_DAILY_LIMIT; i++) state = reserveQuota(state, String(i), now).next;
  assert.equal(reserveQuota(state, 'another', now).code, 'site_limit');
});

function fixture() {
  let state;
  let clock = now;
  let queue = Promise.resolve();
  const saved = [];
  const calls = [];
  const env = {
    ALLOWED_ORIGIN: 'https://zds36.github.io', TURNSTILE_SECRET: 'test-only-captcha-secret',
    SMTP_USER: 'owner@example.com', SMTP_PASSWORD: 'test-only-mail-secret', IP_HASH_SECRET: 'test-only-ip-hash-secret-not-a-real-key',
    MESSAGE_BUDGET: {
      idFromName: name => name,
      get: () => ({ fetch(request) {
        const pending = queue.then(async () => {
          const { key, message } = await request.json();
          saved.push(key);
          const result = reserveQuota(state, key, clock);
          if (result.next) { state = result.next; calls.push(message); }
          return Response.json(result.next ? { ok: true } : result);
        });
        queue = pending.catch(() => {});
        return pending;
      } })
    }
  };
  const request = (overrides = {}) => {
    const data = new FormData();
    data.set('name', 'Visitor'); data.set('message', 'Hello'); data.set('cf-turnstile-response', 'test-only-token');
    return new Request('https://example.workers.dev/message', {
      method: 'POST', body: data,
      headers: { Origin: env.ALLOWED_ORIGIN, 'CF-Connecting-IP': '192.0.2.10', ...overrides }
    });
  };
  return { env, calls, saved, request, tick: () => { clock += 60_000; } };
}

test('trust boundaries, token binding, durable acceptance without waiting for SMTP and no raw IP storage', async t => {
  const originalFetch = globalThis.fetch;
  let verification = { success: true, hostname: 'zds36.github.io', action: 'private-message' };
  const upstream = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    upstream.push(options.body);
    return Response.json(verification);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const f = fixture();
  const health = await handleMessage(new Request('https://example.workers.dev/health'), f.env);
  assert.equal(health.status, 200);
  assert((await health.text()).includes('连接正常'));
  assert.equal(upstream.length, 0, 'Health checks must not validate a token or send a message.');
  assert.equal((await handleMessage(f.request({ Origin: 'https://untrusted.example' }), f.env)).status, 403);
  assert.equal((await handleMessage(f.request({ 'CF-Connecting-IP': '' }), f.env)).status, 400);
  assert.equal((await handleMessage(f.request({ 'Content-Length': '20000' }), f.env)).status, 413);
  assert.equal((await handleMessage(f.request(), { ...f.env, SMTP_PASSWORD: '' })).status, 503);
  for (const invalid of [
    { success: false }, { ...verification, hostname: 'other.example' }, { ...verification, action: 'other' }
  ]) {
    verification = invalid;
    assert.equal((await handleMessage(f.request(), f.env)).status, 400);
  }
  assert.equal(f.calls.length, 0); assert.equal(f.saved.length, 0);
  verification = { success: true, hostname: 'zds36.github.io', action: 'private-message' };
  const accepted = await handleMessage(f.request(), f.env);
  assert.equal(accepted.status, 202);
  assert.deepEqual(await accepted.json(), { ok: true });
  const unavailableStore = { ...f.env, MESSAGE_BUDGET: {
    idFromName: name => name, get: () => ({ fetch: async () => { throw Error('Storage unavailable'); } })
  } };
  assert.equal((await handleMessage(f.request(), unavailableStore)).status, 503, 'Storage failure must never report acceptance.');
  f.tick(); assert.equal((await handleMessage(f.request(), f.env)).status, 202);
  f.tick(); assert.equal((await handleMessage(f.request(), f.env)).status, 202);
  f.tick(); const blocked = await handleMessage(f.request(), f.env);
  assert.equal(blocked.status, 429); assert.equal((await blocked.json()).code, 'daily_limit');
  assert(Number(blocked.headers.get('Retry-After')) > 0);
  assert.equal(f.calls.length, 3);
  assert(f.saved.every(key => /^[a-f0-9]{64}$/.test(key) && !key.includes('192.0.2.10')));
  const otherIP = await handleMessage(f.request({ 'CF-Connecting-IP': '192.0.2.11' }), f.env);
  assert.equal(otherIP.status, 202);
  assert.equal(f.calls[0].message, 'Hello', 'Accepted content must reach durable storage.');
  const burst = fixture();
  const simultaneous = await Promise.all(Array.from({ length: 12 }, () => handleMessage(burst.request(), burst.env)));
  assert.equal(simultaneous.filter(response => response.status === 202).length, 1);
  assert.equal(burst.calls.length, 1);
  assert(upstream.length > 0);
});
