import { isIP } from 'node:net';

const MAX_BYTES = 16_384;
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function reply(origin, status, code, retryAfter) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  if (retryAfter) headers['Retry-After'] = String(retryAfter);
  return Response.json({ ok: status >= 200 && status < 300, ...(code && { code }) }, { status, headers });
}

export async function handleMessage(request, env) {
  const origin = env.ALLOWED_ORIGIN;
  if (request.headers.get('Origin') !== origin) return reply(null, 403, 'origin');
  if (new URL(request.url).pathname !== '/message') return reply(origin, 404, 'not_found');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600', Vary: 'Origin'
    } });
  }
  if (request.method !== 'POST') return reply(origin, 405, 'method');
  if (!env.TURNSTILE_SECRET || !env.SMTP_USER || !env.SMTP_PASSWORD
    || !emailPattern.test(env.SMTP_USER) || !env.IP_HASH_SECRET || env.IP_HASH_SECRET.length < 32
    || !env.MESSAGE_BUDGET) return reply(origin, 503, 'unavailable');
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip || !isIP(ip)) return reply(origin, 400, 'invalid_source');
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return reply(origin, 413, 'too_large');
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(origin, 400, 'invalid_input');
    const chunks = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return reply(origin, 413, 'too_large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const form = await new Request(request.url, { method: 'POST', headers: request.headers, body: bytes }).formData();
    const fields = ['name', 'email', 'message', 'cf-turnstile-response'];
    if (fields.some(key => form.getAll(key).length > 1 || (form.has(key) && typeof form.get(key) !== 'string'))) {
      return reply(origin, 400, 'invalid_input');
    }
    const [name, email, message, token] = fields.map(key => (form.get(key) || '').trim());
    if (!message || message.length > 2000 || name.length > 40 || email.length > 254
      || (email && !emailPattern.test(email)) || !token || token.length > 2048) {
      return reply(origin, 400, 'invalid_input');
    }
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(10_000)
    });
    const result = verification.ok && await verification.json();
    if (!result || result.success !== true || result.hostname !== new URL(origin).hostname
      || result.action !== 'private-message') return reply(origin, 400, 'verification');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.IP_HASH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
    const ipKey = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
    const budget = env.MESSAGE_BUDGET.get(env.MESSAGE_BUDGET.idFromName('daily-budget'));
    const reservation = await budget.fetch(new Request('https://budget/reserve', {
      method: 'POST', body: JSON.stringify({ key: ipKey, message: { name, email, message } })
    }));
    if (!reservation.ok) return reply(origin, 503, 'unavailable');
    const allowed = await reservation.json();
    if (allowed.code) return reply(origin, 429, allowed.code, allowed.retryAfter);
    if (allowed.ok !== true) return reply(origin, 503, 'unavailable');
    return reply(origin, 202);
  } catch { return reply(origin, 503, 'unavailable'); }
}
