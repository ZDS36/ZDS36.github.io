import { DurableObject } from 'cloudflare:workers';

export class SiteStats extends DurableObject {
  read(increment) {
    const storage = this.ctx.storage;
    return storage.transactionSync(() => {
      const total = storage.kv.get('total') ?? 0;
      if (!increment) return total;
      storage.kv.put('total', total + 1);
      return total + 1;
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/site-stats') return new Response(null, { status: 404 });
    const { method } = request;
    if (method !== 'GET' && method !== 'POST') {
      return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
    }
    if (method === 'POST') {
      if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      const events = url.searchParams.getAll('event');
      if (events.length !== 1 || (events[0] !== 'view' && events[0] !== 'click')) return new Response(null, { status: 400 });
    }

    const headers = { 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN, 'Cache-Control': 'no-store' };
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return new Response(null, { status: 400, headers });
    const historical = env.HISTORICAL_CLICKS;
    if (!Number.isSafeInteger(historical) || historical < 0) return new Response(null, { status: 503, headers });
    try {
      const { success } = await env.SITE_STATS_LIMIT.limit({ key: `${method}:${ip}` });
      if (!success) return new Response(null, { status: 429, headers: { ...headers, 'Retry-After': '60' } });
      const total = await env.SITE_STATS.getByName('site-clicks').read(method === 'POST');
      return Response.json({ total: historical + total }, { headers });
    } catch {
      return new Response(null, { status: 503, headers });
    }
  }
};
