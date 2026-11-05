import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const configured = new URL(process.argv[2] || 'http://127.0.0.1:4175');
const unconfigured = new URL(process.argv[3] || 'http://127.0.0.1:4177');
for (const url of [configured, unconfigured]) assert(['127.0.0.1', 'localhost'].includes(url.hostname));
const browser = await chromium.launch({ headless: true, chromiumSandbox: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const requests = [];
  const errors = [];
  let outcome = 'success';
  let finishRequest;
  let captchaFails = false;
  let rateCode = '';
  await page.route('https://challenges.cloudflare.com/**', route => captchaFails ? route.abort() : route.fulfill({
    contentType: 'text/javascript', body: `
      window.captchaScriptAsync = document.currentScript.async || document.currentScript.defer;
      window.turnstile = {
        ready: callback => {
          if (window.captchaScriptAsync) throw new Error('[Cloudflare Turnstile] Remove async/defer before using turnstile.ready(). Code: 3857');
          callback();
        },
        render: (container, options) => {
          container.innerHTML = '<div style="width:150px;height:140px;border:1px solid #49513c;padding:12px;box-sizing:border-box">本地验证占位</div>';
          window.captcha = { options, token: '', resets: 0 };
          return 'mock-widget';
        },
        getResponse: () => window.captcha.token,
        reset: () => { window.captcha.token = ''; window.captcha.resets++; },
        remove: () => { window.captcha = null; }
      };`
  }));
  const verify = async () => {
    try {
      await page.waitForFunction(() => window.captcha, null, { timeout: 2000 });
    } catch {
      assert.fail(`Turnstile did not render. Browser errors: ${errors.join('; ') || '(none)'}`);
    }
    await page.evaluate(() => { window.captcha.token = 'local-mock-token'; window.captcha.options.callback('local-mock-token'); });
    await page.waitForFunction(() => !document.querySelector('.private-message__submit').disabled);
  };
  page.on('pageerror', error => errors.push(error.message));
  const interceptSubmission = async route => {
    requests.push(route.request().postData());
    assert.equal(new URL(route.request().url()).pathname, '/message');
    if (outcome === 'network') return route.abort();
    if (outcome === 'pending') await new Promise(resolve => { finishRequest = resolve; });
    if (outcome === 'slow') {
      await new Promise(resolve => setTimeout(resolve, 31000));
      if (route.request().failure()) return;
    }
    await route.fulfill({ status: outcome === 'error' ? 429 : 200, contentType: 'application/json', body: outcome === 'error' ? JSON.stringify({ code: rateCode }) : '{"ok":true}' });
  };
  await page.route('https://formspree.io/**', () => { assert.fail('Retired Formspree endpoint must not be used.'); });
  await page.route('https://qa-messages.qa.workers.dev/**', interceptSubmission);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${unconfigured}#contact`);
  await page.locator('.private-message__form').waitFor();
  assert(await page.locator('.private-message__submit').isDisabled(), 'An unconnected form must not accept messages.');
  assert.equal(requests.length, 0);
  assert.equal(await page.locator('#message-turnstile').count(), 0, 'An unconfigured form must not load CAPTCHA.');

  await page.goto(`${configured}#contact`);
  const message = page.locator('#message-text');
  const email = page.locator('#message-email');
  const submit = page.locator('.private-message__submit');
  const feedback = page.locator('#message-feedback');
  await page.waitForFunction(() => !document.getElementById('message-text').disabled);
  assert(await submit.isDisabled(), 'No submission before verification.');
  await message.fill('没有验证码时必须拦截。');
  await page.locator('.private-message__form').evaluate(form => form.requestSubmit());
  assert.equal(requests.length, 0, 'Programmatic submission without a token must not send.');
  await verify();
  await message.fill('   ');
  await submit.click();
  await page.waitForFunction(() => document.getElementById('message-feedback').textContent.includes('写下一点内容'));
  assert.equal(requests.length, 0, 'Whitespace-only content must not be sent.');
  await message.fill('这是一条仅用于本地验证的留言。');
  await email.fill('invalid');
  await submit.click();
  assert.equal(requests.length, 0, 'Malformed email must not be sent.');
  await email.fill('');
  outcome = 'error';
  await submit.click();
  await page.waitForFunction(() => document.getElementById('message-feedback').textContent.includes('内容已保留'));
  assert((await feedback.textContent()).includes('提交过于频繁'), 'Server rate limits need a specific, honest error.');
  assert.equal(await message.inputValue(), '这是一条仅用于本地验证的留言。');
  assert(!requests[0].includes('name="email"'), 'Blank reply email should be omitted.');
  assert(requests[0].includes('name="cf-turnstile-response"') && requests[0].includes('local-mock-token'), 'Submission must carry the CAPTCHA token.');
  assert.equal(await page.evaluate(() => window.captcha.resets), 1, 'Used tokens must be reset even after HTTP errors.');
  assert(await submit.isDisabled());

  outcome = 'network';
  await verify();
  await submit.click();
  await page.waitForFunction(() => !document.querySelector('.private-message__form').getAttribute('aria-busy') || document.querySelector('.private-message__form').getAttribute('aria-busy') === 'false');
  assert.equal(await message.inputValue(), '这是一条仅用于本地验证的留言。');
  assert((await feedback.textContent()).includes('内容已保留'));
  assert.equal(await page.evaluate(() => window.captcha.resets), 2);

  await email.fill('visitor@example.com');
  await page.locator('#message-name').fill('  访客  ');
  await verify();
  await page.evaluate(() => { window.captcha.token = ''; window.captcha.options['expired-callback'](); });
  assert(await submit.isDisabled(), 'Expired tokens must disable submission.');
  await page.locator('.private-message__form').evaluate(form => form.requestSubmit());
  assert.equal(requests.length, 2, 'Expired tokens must not send.');
  for (const [code, copy] of [['daily_limit', '3 次投递上限'], ['cooldown', '60 秒'], ['site_limit', '保护上限']]) {
    rateCode = code; outcome = 'error';
    await verify(); await submit.click();
    await page.waitForFunction(copy => document.getElementById('message-feedback').textContent.includes(copy), copy);
    assert.equal(await message.inputValue(), '这是一条仅用于本地验证的留言。');
  }
  rateCode = '';
  await verify();
  outcome = 'pending';
  const previousRequests = requests.length;
  await page.locator('.private-message__form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
  await page.waitForFunction(() => document.querySelector('.private-message__form').getAttribute('aria-busy') === 'true');
  assert(await submit.isDisabled(), 'Sending must disable duplicate submission.');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(requests.length, previousRequests + 1);
  assert(finishRequest, 'Mock request did not start.');
  finishRequest();
  await page.waitForFunction(() => document.getElementById('message-feedback').textContent.includes('留言已提交'));
  assert.equal(await message.inputValue(), '');
  assert.equal(await email.inputValue(), '');
  assert((await submit.textContent()).includes('已寄出'), 'Success must be visible on the button the visitor clicked.');
  assert(await feedback.evaluate(element => element.compareDocumentPosition(document.querySelector('.private-message__submit')) & Node.DOCUMENT_POSITION_FOLLOWING), 'Result feedback must appear before the send button.');
  assert(await submit.isDisabled(), 'A successful send needs a new verification.');
  await message.fill('下一条留言');
  assert((await submit.textContent()).includes('寄出留言'), 'Editing a new message must restore the send label.');
  await page.evaluate(() => { location.hash = '#work-site'; });
  await page.waitForFunction(() => !document.querySelector('.private-message__form'));
  await page.evaluate(() => { location.hash = '#contact'; });
  await page.waitForFunction(() => window.captcha && document.querySelector('.private-message__form'));
  assert(await submit.isDisabled(), 'A remounted form needs fresh verification.');
  assert.equal(await page.locator('#message-turnstile').count(), 1, 'Navigation must reuse the CAPTCHA script.');
  await verify();
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'Private messages must not be saved in browser storage.');
  assert.deepEqual(errors, []);

  captchaFails = true;
  await page.reload();
  await page.waitForFunction(() => document.querySelector('.private-message__verification').textContent.includes('验证暂时不可用'));
  await message.fill('验证失败也保留正文。');
  const beforeFailure = requests.length;
  await page.locator('.private-message__form').evaluate(form => form.requestSubmit());
  assert.equal(requests.length, beforeFailure, 'Blocked CAPTCHA must not bypass verification.');
  assert.equal(await message.inputValue(), '验证失败也保留正文。');
  captchaFails = false;
  assert.deepEqual(errors, []);

  outcome = 'slow';
  await page.reload();
  await verify();
  await message.fill('慢回执也必须正确确认成功。');
  await submit.click();
  await page.waitForFunction(() => document.querySelector('.private-message__form').getAttribute('aria-busy') === 'false', null, { timeout: 35000 });
  assert((await feedback.textContent()).includes('留言已提交'), 'A successful receipt after 31 seconds must not be reported as an unconfirmed send.');
  assert.equal(await message.inputValue(), '');
  outcome = 'success';

  await verify();
  await message.fill('等待回执超时也必须保留正文。');
  await page.evaluate(() => {
    window.originalMessageFetch = window.fetch;
    window.fetch = () => Promise.reject(new DOMException('Test timeout', 'TimeoutError'));
  });
  await submit.click();
  await page.waitForFunction(() => document.querySelector('.private-message__form').getAttribute('aria-busy') === 'false');
  assert((await feedback.textContent()).includes('留言可能已送达'));
  assert((await feedback.textContent()).includes('避免重复寄出'));
  assert.equal(await message.inputValue(), '等待回执超时也必须保留正文。');
  await page.evaluate(() => { window.fetch = window.originalMessageFetch; delete window.originalMessageFetch; });

  await mkdir('.site-build/qa', { recursive: true });
  for (const [label, width, height] of [['desktop', 1440, 1100], ['mobile', 390, 844], ['narrow', 320, 740]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${configured}#contact`);
    await page.reload();
    await page.locator('.private-message').scrollIntoViewIfNeeded();
    assert(await page.locator('#main-content').evaluate(main => main.scrollWidth <= main.clientWidth + 1));
    await page.locator('.private-message__submit').scrollIntoViewIfNeeded();
    await verify();
    await message.fill('只在本地验证成功提示的位置。');
    await submit.evaluate(button => {
      const main = document.getElementById('main-content');
      main.scrollTop += button.getBoundingClientRect().bottom - main.getBoundingClientRect().bottom + 8;
    });
    await submit.click();
    await page.waitForFunction(() => document.getElementById('message-feedback').textContent.includes('留言已提交'));
    assert((await submit.textContent()).includes('已寄出'));
    assert(await feedback.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const viewport = document.getElementById('main-content').getBoundingClientRect();
      return bounds.top >= viewport.top - 1 && bounds.bottom <= viewport.bottom + 1;
    }), 'Success feedback must be in view even when the button was near the bottom edge.');
    assert(await submit.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const viewport = document.getElementById('main-content').getBoundingClientRect();
      return bounds.top >= viewport.top - 1 && bounds.bottom <= viewport.bottom + 1;
    }), 'The confirmed-send button must also remain visible.');
    await page.screenshot({ path: `.site-build/qa/private-message-${label}.png` });
  }
  console.log('Passed: unconfigured form; missing, expired and unavailable CAPTCHA; token inclusion/reset; empty/invalid input; optional reply email; rate/network failures preserving text; duplicate protection; success reset; 31-second successful receipt; honest timeout feedback; responsive layout. CAPTCHA and submissions were mocked locally; no email was sent.');
} finally {
  await browser.close();
}
