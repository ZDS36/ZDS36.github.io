import React, { useEffect, useRef, useState } from 'react';

const workerUrl = (import.meta.env.VITE_MESSAGE_ENDPOINT || '').trim();
const endpoint = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/message$/.test(workerUrl) ? workerUrl : '';
const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();
const configured = Boolean(endpoint && siteKey);

export default function PrivateMessage() {
  const [status, setStatus] = useState('idle');
  const [feedback, setFeedback] = useState('');
  const sending = useRef(false);
  const challenge = useRef(null);
  const widget = useRef(null);
  const feedbackElement = useRef(null);
  const [verification, setVerification] = useState('loading');

  useEffect(() => {
    if (status === 'success') feedbackElement.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [status]);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    const failed = () => { if (active) setVerification('error'); };
    // The load event handles async scripts; Turnstile.ready() rejects async/defer loading.
    const render = () => {
      if (!active) return;
      try {
        widget.current = window.turnstile.render(challenge.current, {
          sitekey: siteKey, action: 'private-message', theme: 'dark', size: 'compact', 'response-field': false,
          callback: () => { if (active) setVerification('ready'); },
          'expired-callback': () => { if (active) setVerification('expired'); },
          'error-callback': failed
        });
      } catch { failed(); }
    };
    let script = document.getElementById('message-turnstile');
    if (!script) {
      script = document.createElement('script');
      script.id = 'message-turnstile';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      document.head.appendChild(script);
    }
    if (window.turnstile) render();
    else script.addEventListener('load', render);
    script.addEventListener('error', failed);
    return () => {
      active = false;
      script.removeEventListener('load', render);
      script.removeEventListener('error', failed);
      if (widget.current !== null) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!configured || sending.current) return;
    const token = widget.current !== null && window.turnstile.getResponse(widget.current);
    if (verification !== 'ready' || !token) {
      setStatus('error');
      setFeedback('请先完成人机验证，再寄出留言。');
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const message = data.get('message').trim();
    if (!message) {
      setStatus('error');
      setFeedback('写下一点内容，再寄出吧。');
      form.elements.message.focus();
      return;
    }
    data.set('message', message);
    data.set('name', data.get('name').trim());
    const email = data.get('email').trim();
    if (email) data.set('email', email);
    else data.delete('email');
    data.set('cf-turnstile-response', token);
    sending.current = true;
    setStatus('sending');
    setFeedback('正在寄出，请稍候…');
    try {
      const response = await fetch(endpoint, {
        method: 'POST', body: data, headers: { Accept: 'application/json' },
        credentials: 'omit', signal: AbortSignal.timeout(60000)
      });
      if (response.status === 429) {
        setStatus('error');
        const details = await response.json().catch(() => ({}));
        const messages = {
          daily_limit: '这个网络今天已达到 3 次投递上限，请明天再来。内容已保留。',
          cooldown: '两次投递请至少间隔 60 秒。内容已保留。',
          site_limit: '今日留言通道已达到保护上限，请明天再来。内容已保留。'
        };
        setFeedback(messages[details.code] || '当前留言通道提交过于频繁，请稍后再试。内容已保留。');
        return;
      }
      if (!response.ok) throw new Error('Message was not accepted.');
      form.reset();
      setStatus('success');
      setFeedback('发送成功');
    } catch (error) {
      setStatus('error');
      setFeedback(error?.name === 'TimeoutError'
        ? '等待投递确认已超时，留言可能已送达。内容已保留，请先查收邮箱，避免重复寄出。'
        : '暂时没能确认提交结果，内容已保留，请稍后再试。');
    } finally {
      sending.current = false;
      if (widget.current !== null) {
        setVerification('loading');
        window.turnstile.reset(widget.current);
      }
    }
  };

  return (
    <div className="private-message">
      <div className="private-message__intro">
        <p className="page-kicker"><span>JUST BETWEEN US</span></p>
        <h2>留一段话，<br /><em>寄给我。</em></h2>
        <p>一点近况，一个想法，<br />或者只是路过时的一声问候。</p>
        <span className="private-message__seal"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></svg> 私密投递 · 不公开展示</span>
      </div>
      <form className="private-message__form" onSubmit={submit} onChange={() => {
        if (status === 'success') { setStatus('idle'); setFeedback(''); }
      }} aria-label="私密留言" aria-busy={status === 'sending'}>
        <fieldset disabled={!configured || status === 'sending'}>
          <legend className="private-message__legend">给张刀宋的留言</legend>
          <div className="private-message__fields">
            <label htmlFor="message-name">怎么称呼你 <span>选填</span><input id="message-name" name="name" autoComplete="nickname" maxLength="40" placeholder="留下一个名字" /></label>
            <label htmlFor="message-email">你的邮箱 <span>选填，方便我回复</span><input id="message-email" name="email" type="email" autoComplete="email" maxLength="254" placeholder="you@example.com" /></label>
          </div>
          <label htmlFor="message-text">想说的话<textarea id="message-text" name="message" required maxLength="2000" rows="6" placeholder="在这里写下你想说的话…" aria-describedby="message-privacy message-feedback" /></label>
          <p className="private-message__privacy" id="message-privacy">最多 2000 字。留言不会在网站公开。Cloudflare 接收并暂存待投递留言，由 QQ 邮箱通知，投递后删除。同一网络每天最多 3 次，两次间隔至少 60 秒，每天零点（北京时间）重置。</p>
          {configured && <div className="private-message__verification">
            <div ref={challenge} />
            <p role="status">{verification === 'ready' ? '验证已通过，可以寄出。' : verification === 'error' ? '验证暂时不可用，请先复制留言，再刷新页面重试。' : verification === 'expired' ? '验证已过期，请在验证框重新验证。' : '请完成上方验证；若没有出现验证框，请先复制留言，再刷新页面重试。'}</p>
          </div>}
          <div ref={feedbackElement}>
            <p id="message-feedback" className={`private-message__feedback private-message__feedback--${status}`} role="status" aria-live="polite" aria-atomic="true">{feedback}</p>
            <button className="private-message__submit" type="submit" disabled={verification !== 'ready'}><span>{status === 'sending' ? '正在寄出…' : status === 'success' ? '发送成功' : '寄出留言'}</span><span aria-hidden="true">{status === 'success' ? '✓' : '↗'}</span></button>
          </div>
        </fieldset>
        {!configured && <p className="private-message__unavailable">留言暂未开放，你也可以先通过 <a href="https://github.com/ZDS36" target="_blank" rel="noreferrer">GitHub 找到我 ↗</a>。</p>}
      </form>
    </div>
  );
}
