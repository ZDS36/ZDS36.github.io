import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.argv[2] || 'http://127.0.0.1:4175');
const evidence = fileURLToPath(new URL('../.site-build/qa/', import.meta.url));
await mkdir(evidence, { recursive: true });
const expectedZip = await readFile(new URL('../public/downloads/logic-lab/logic-circuit-lab-beta.zip', import.meta.url));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });

try {
  for (const width of [1440, 1024, 820, 768, 390, 320]) {
    const mobile = width <= 390;
    const page = await browser.newPage({ viewport: { width, height: mobile ? 844 : 900 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'reduce' });
    const errors = [];
    const requests = [];
    page.setDefaultTimeout(7000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.route('**/*', route => new URL(route.request().url()).origin === base.origin ? route.continue() : route.abort());
    await page.goto(new URL('/#work-logic-lab', base).href);
    const detail = page.locator('[data-view=work-logic-lab]');
    assert.equal(await detail.locator('h1').innerText(), '数字电路实验台');
    await detail.locator('img').evaluate(image => image.decode());
    const overflow = await page.evaluate(() => {
      const main = document.getElementById('main-content');
      return Math.max(document.documentElement.scrollWidth - innerWidth, main.scrollWidth - main.clientWidth);
    });
    assert.ok(overflow <= 1, `Project detail overflows at ${width}px.`);
    for (const name of ['打开实验台', '下载离线版']) {
      const box = await detail.getByRole('link', { name }).boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1 && box.height >= 44, `${name} is clipped or too small at ${width}px.`);
    }
    assert.ok(!requests.some(url => url.startsWith('/tools/logic-lab') || url.endsWith('.zip')), 'The project detail eagerly loaded the simulator or download.');
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: path.join(evidence, `logic-lab-${width}.png`), animations: 'disabled' });
    }
    if (width === 1440) {
      const [download] = await Promise.all([page.waitForEvent('download'), detail.getByRole('link', { name: '下载离线版' }).click()]);
      assert.equal(download.suggestedFilename(), 'logic-circuit-lab-beta.zip');
      assert.ok((await readFile(await download.path())).equals(expectedZip), 'ZIP differs from the checked release.');
      await detail.getByRole('link', { name: '返回作品' }).click();
      await page.locator('.work-card[href="#work-logic-lab"]').click();
      await detail.waitFor();
      await page.goto(new URL('/#slices', base).href);
      const entry = page.locator('.moment-card').filter({ hasText: '数字电路实验台上线' });
      assert.equal(await entry.locator('..').locator('time').getAttribute('datetime'), '2026-11-26');
      await entry.getByRole('link', { name: '查看实验台' }).click();
      await detail.waitFor();
    }
    await detail.getByRole('link', { name: '打开实验台' }).click();
    await page.waitForURL(new URL('/tools/logic-lab/', base).href);
    assert.ok(await page.evaluate(() => {
      const header = document.querySelector('.masthead').getBoundingClientRect();
      const tools = document.querySelector('.head-actions').getBoundingClientRect();
      return document.documentElement.scrollWidth <= innerWidth + 1 && tools.bottom <= header.bottom + 1;
    }), `Simulator toolbar overflows at ${width}px.`);
    if (width === 390) {
      await page.locator('#toggle-library').tap();
      await page.locator('#sample-picker').selectOption('2');
      assert.equal(await page.locator('#project-name').innerText(), '三人表决');
      await page.locator('#diagram[data-routing=ready]').waitFor();
      assert.equal(await page.locator('.route-blocked').count(), 0);
      await page.locator('#open-tutorial').tap();
      await page.locator('[data-tutorial-course=truth]').tap();
      await page.locator('#tutorial-layer:not([hidden])').waitFor();
      await page.locator('#tutorial-exit').tap();
      await page.locator('#toggle-library').tap();
      await page.locator('#new-workspace').tap();
      await page.locator('#workspace-name').fill('手机工作区');
      await page.locator('#workspace-form button[type=submit]').tap();
      await page.reload();
      assert.equal(await page.locator('#project-name').innerText(), '手机工作区');
    }
    if (width === 1440) {
      await page.locator('#sample-picker').selectOption('3');
      await page.locator('#diagram[data-routing=ready]').waitFor();
      assert.equal(await page.locator('.route-blocked').count(), 0);
      await page.locator('[data-verify=truth]').click();
      await page.waitForFunction(() => document.getElementById('status').textContent.startsWith('验证完成'));
      assert.match(await page.locator('.table-summary').innerText(), /符合 72 · 不符 0/);
      const isLayout = url => /\/tools\/logic-lab\/elk-(?:worker|fallback)\.js$/.test(url);
      assert.ok(!requests.some(isLayout), 'Opening, viewing and verifying an example must leave the layout engine unloaded.');
      await page.locator('#arrange').click();
      await page.waitForFunction(() => document.getElementById('status').textContent.startsWith('已整理器件和导线'));
      await page.locator('#diagram[data-routing=ready]').waitFor();
      assert.ok(requests.some(url => url.endsWith('/elk-worker.js')), 'First arrangement must request the separate worker.');
      assert.ok(!requests.some(url => url.endsWith('/elk-fallback.js')), 'The fallback must remain unloaded when the worker succeeds.');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Passed: six widths, project and time-tree links, exact ZIP download, online truth table, touch tutorial and workspace recovery.');
} finally {
  await browser.close();
}
