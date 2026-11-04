import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import tls from 'node:tls';
import nodemailer from 'nodemailer';
import { sendMail } from '../src/mail.mjs';

test('mail uses hostname TLS, keeps the recipient fixed and closes after connection failure', async t => {
  let fail = false;
  let closed = 0;
  t.mock.method(tls, 'connect', options => {
    assert.equal(options.host, 'smtp.qq.com');
    assert.equal(options.port, 465);
    assert.equal(options.servername, 'smtp.qq.com');
    assert.equal(options.rejectUnauthorized, true);
    const socket = new EventEmitter();
    socket.destroy = () => {};
    queueMicrotask(() => fail ? socket.emit('error', Error('connection failed')) : socket.emit('secureConnect'));
    return socket;
  });
  t.mock.method(nodemailer, 'createTransport', options => {
    assert.equal(typeof options.getSocket, 'function', 'Workers must avoid Nodemailer DNS/IP pre-resolution.');
    return {
      async sendMail(message) {
        const socket = await new Promise((resolve, reject) => options.getSocket({}, (error, result) => error ? reject(error) : resolve(result)));
        assert.equal(socket.secured, true);
        assert.equal(message.to, 'owner@example.com');
        assert.equal(message.from.address, message.to);
        assert.equal(message.replyTo, 'visitor@example.com');
      },
      close() { closed++; }
    };
  });
  const env = { SMTP_USER: 'owner@example.com', SMTP_PASSWORD: 'test-only-secret' };
  const message = { name: 'Visitor', email: 'visitor@example.com', message: 'Hello' };
  await sendMail(env, message);
  fail = true;
  await assert.rejects(sendMail(env, message), /connection failed/);
  assert.equal(closed, 2);
});
