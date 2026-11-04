import { DurableObject } from 'cloudflare:workers';
import { handleMessage } from './handler.mjs';
import { reserveQuota } from './quota.mjs';
import { sendMail } from './mail.mjs';

export class MessageBudget extends DurableObject {
  async fetch(request) {
    const { key } = await request.json();
    if (!/^[a-f0-9]{64}$/.test(key)) return new Response(null, { status: 400 });
    const decision = await this.ctx.storage.transaction(async tx => {
      const result = reserveQuota(await tx.get('budget'), key, Date.now());
      if (result.next) await tx.put('budget', result.next);
      return result.next ? { ok: true } : result;
    });
    return Response.json(decision);
  }
}

export default { fetch: (request, env) => handleMessage(request, env, sendMail) };
