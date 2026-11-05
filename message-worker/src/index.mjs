import { DurableObject } from 'cloudflare:workers';
import { handleMessage } from './handler.mjs';
import { reserveQuota } from './quota.mjs';
import { sendMail } from './mail.mjs';
import { deliverNext } from './outbox.mjs';

export class MessageBudget extends DurableObject {
  async fetch(request) {
    const { key, message } = await request.json();
    if (!/^[a-f0-9]{64}$/.test(key) || !message
      || ['name', 'email', 'message'].some(field => typeof message[field] !== 'string')
      || !message.message.trim() || message.message.length > 2000
      || message.name.length > 40 || message.email.length > 254) return new Response(null, { status: 400 });
    const now = Date.now();
    const id = crypto.randomUUID();
    const decision = await this.ctx.storage.transaction(async tx => {
      const result = reserveQuota(await tx.get('budget'), key, now);
      if (result.next) {
        await tx.put('budget', result.next);
        await tx.put(`outbox:${now}:${id}`, { ...message, id, attempts: 0 });
        if (await tx.getAlarm() === null) await tx.setAlarm(now + 1000);
      }
      return result.next ? { ok: true } : result;
    });
    return Response.json(decision);
  }

  async alarm() {
    await deliverNext(this.ctx.storage, message => sendMail(this.env, message));
  }
}

export default { fetch: handleMessage };
