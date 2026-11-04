import { DurableObject } from 'cloudflare:workers';
import nodemailer from 'nodemailer';
import { handleMessage } from './handler.mjs';
import { reserveQuota } from './quota.mjs';

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

async function sendMail(env, { name, email, message }) {
  const transport = nodemailer.createTransport({
    host: 'smtp.qq.com', port: 465, secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    tls: { servername: 'smtp.qq.com', rejectUnauthorized: true },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12_000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true
  });
  try {
    await transport.sendMail({
      from: { name: '未定态留言', address: env.SMTP_USER }, to: env.SMTP_USER,
      ...(email && { replyTo: email }), subject: '未定态 · 收到一段私密留言',
      text: `称呼：${name || '未填写'}\n回复邮箱：${email || '未填写'}\n\n${message}`
    });
  } finally { transport.close(); }
}

export default { fetch: (request, env) => handleMessage(request, env, sendMail) };
