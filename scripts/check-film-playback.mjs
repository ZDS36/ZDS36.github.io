import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.argv[2] || 'http://127.0.0.1:4187');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use a local preview.');
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
const evidence = fileURLToPath(new URL('../.site-build/qa/', import.meta.url));
await mkdir(evidence, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 200, downloadThroughput: 125000, uploadThroughput: 62500, connectionType: 'cellular3g' });
  await page.goto(`${base}#work-film`);
  await page.waitForSelector('video');
  const started = Date.now();
  await page.locator('video').evaluate(el => { el.play().catch(() => {}); });
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return video.currentTime > .1 && video.videoWidth === 960;
  }, null, { timeout: 15000 });
  const firstFrameMs = Date.now() - started;
  assert(firstFrameMs < 8000, `Mobile cold start exceeded 8 seconds: ${firstFrameMs} ms`);
  await page.locator('video').evaluate(el => el.pause());
  const htmlLink = page.locator('.film-html-link');
  assert((await htmlLink.getAttribute('href')).includes('animation.html?v='));
  console.log(`Passed: Android touch viewport, 1 Mbps / 200 ms latency, first video frame in ${firstFrameMs} ms.`);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await htmlLink.tap();
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  await page.locator('#start').tap();
  await page.waitForFunction(() => window.Film.report().playing && window.Film.report().time > .1);
  await page.waitForFunction(() => document.getElementById('web-play').textContent === '暂停');
  await page.locator('#web-play').tap();
  await page.waitForFunction(() => !window.Film.report().playing);
  await page.locator('#web-seek').evaluate(el => { el.value = '74'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  assert(Math.abs(await page.evaluate(() => window.Film.report().time) - 74) < .1);
  for (const [label, width, height] of [['portrait', 390, 844], ['landscape', 844, 390], ['desktop', 1366, 768]]) {
    await page.setViewportSize({ width, height });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert(overflow <= 1, `HTML player overflows at ${width}px.`);
    for (const id of ['web-play', 'web-replay', 'web-fullscreen']) {
      const box = await page.locator(`#${id}`).boundingBox();
      assert(box && box.height >= 44 && box.width >= 44 && box.y >= 0 && box.y + box.height <= height + 1, `Touch control ${id} is inaccessible.`);
    }
    await page.screenshot({ path: `${evidence}/animation-${label}.png` });
  }
  await page.locator('#web-replay').click();
  await page.waitForFunction(() => window.Film.report().playing && window.Film.report().time < 3);
  await page.evaluate(() => window.Film.pause());
  assert.deepEqual(errors, [], 'HTML animation reported script errors.');
  console.log('Passed: HTML animation loads, starts by touch, pauses, seeks, replays and keeps 44px controls in portrait and landscape.');
  await context.close();

  const failure = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await failure.route('**/film.mp4*', route => route.abort());
  const broken = await failure.newPage();
  await broken.goto(`${base}#work-film`);
  await broken.locator('video').evaluate(el => { el.play().catch(() => {}); });
  await broken.locator('.film-error').waitFor();
  await broken.locator('.film-html-link').click();
  await broken.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  await failure.close();
  console.log('Passed: video load failure exposes a working HTML alternative.');
} finally {
  await browser.close();
}
