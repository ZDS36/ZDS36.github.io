import nodemailer from 'nodemailer';
import tls from 'node:tls';

// Nodemailer's resolved-IP connection fails on Workers; keep hostname TLS and SNI intact.
function getSocket(_options, callback) {
  let socket;
  try { socket = tls.connect({ host: 'smtp.qq.com', port: 465, servername: 'smtp.qq.com', rejectUnauthorized: true }); }
  catch (error) { callback(error); return; }
  const timer = setTimeout(() => done(new Error('SMTP TLS connection timed out.')), 8000);
  const ready = () => done(null);
  function done(error) {
    clearTimeout(timer);
    socket.removeListener('error', done);
    socket.removeListener('secureConnect', ready);
    if (error) socket.destroy();
    callback(error, error ? undefined : { connection: socket, secured: true });
  }
  socket.once('error', done);
  socket.once('secureConnect', ready);
}

export async function sendMail(env, { name, email, message }) {
  const transport = nodemailer.createTransport({
    host: 'smtp.qq.com', port: 465, secure: true,
    getSocket,
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
