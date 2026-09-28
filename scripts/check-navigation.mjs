import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Use an existing Playwright install; PLAYWRIGHT_MODULE can point to a bundled package.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.argv[2] || 'http://127.0.0.1:4173');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Use a local preview URL.');
const routes = ['top', 'works', 'work-site', 'work-dashboard', 'slices', 'about', 'contact'];
const browser = await chromium.launch({ headless: true, chromiumSandbox: true });

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const errors = [];
  const externalRequests = [];
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base.origin) return route.continue();
    externalRequests.push(url.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('download', () => errors.push('Unexpected download'));
  page.on('popup', () => errors.push('Unexpected popup'));
  await page.addInitScript(() => {
    window.navigationFrames = { checked: 0, failures: [] };
    const checkFrame = () => {
      const view = document.querySelector('[data-view]');
      if (view) {
        window.navigationFrames.checked++;
        for (let node = view; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (Number(style.opacity) < 0.99 || style.visibility === 'hidden' || style.display === 'none') {
            if (window.navigationFrames.failures.length < 10) {
              window.navigationFrames.failures.push(`${view.dataset.view}: ${node.tagName} hidden or translucent`);
            }
            break;
          }
          for (const pseudo of ['::before', '::after']) {
            const overlay = getComputedStyle(node, pseudo);
            if (!['none', 'normal'].includes(overlay.content) && ['absolute', 'fixed'].includes(overlay.position)
              && overlay.display !== 'none' && overlay.visibility !== 'hidden' && Number(overlay.opacity) > 0.01
              && (parseFloat(overlay.zIndex) || 0) >= 0
              && parseFloat(overlay.width) >= node.clientWidth * 0.9 && parseFloat(overlay.height) >= node.clientHeight * 0.9
              && (overlay.backgroundImage !== 'none' || !['transparent', 'rgba(0, 0, 0, 0)'].includes(overlay.backgroundColor))
              && window.navigationFrames.failures.length < 10) {
              window.navigationFrames.failures.push(`${view.dataset.view}: full-view ${pseudo} overlay`);
            }
          }
        }
      } else if (window.navigationFrames.checked > 0 && window.navigationFrames.failures.length < 10) {
        window.navigationFrames.failures.push('No view rendered after navigation.');
      }
      requestAnimationFrame(checkFrame);
    };
    requestAnimationFrame(checkFrame);
  });

  const settled = async (route, focus = true) => {
    await page.waitForFunction(({ route, focus }) => {
      const views = document.querySelectorAll('[data-view]');
      return views.length === 1 && views[0].dataset.view === route
        && (!focus || document.activeElement === views[0].querySelector('h1'));
    }, { route, focus });
  };
  const navigate = async (route) => {
    const changed = await page.evaluate((route) => {
      if (location.hash === `#${route}`) return false;
      location.hash = route;
      return true;
    }, route);
    await settled(route, changed);
  };
  const frames = () => page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const checkFrames = async () => {
    const result = await page.evaluate(() => window.navigationFrames);
    assert(result.checked > 0, 'No rendered frames sampled.');
    assert.deepEqual(result.failures, [], 'A whole view flashed transparent.');
  };

  await page.goto(`${base}#top`);
  await settled('top', false);
  await page.evaluate(() => { window.originalMain = document.getElementById('main-content'); });
  for (let pass = 0; pass < 3; pass++) {
    for (const route of routes) await navigate(route);
  }
  await navigate('top');
  await page.evaluate((routes) => { for (const route of routes) location.hash = route; }, routes);
  await settled('contact');
  await frames();
  await checkFrames();
  assert(await page.evaluate(() => window.originalMain === document.getElementById('main-content')), 'Main shell remounted.');

  await navigate('works');
  await page.locator('a[href="#work-site"]').first().click();
  await settled('work-site');
  await page.locator('a[href="#work-dashboard"]').first().click();
  await settled('work-dashboard');
  await page.goBack();
  await settled('work-site');
  await page.goForward();
  await settled('work-dashboard');

  await page.setViewportSize({ width: 390, height: 560 });
  await navigate('works');
  const savedScroll = await page.locator('#main-content').evaluate((main) => {
    main.scrollTop = Math.min(180, main.scrollHeight - main.clientHeight);
    return main.scrollTop;
  });
  assert(savedScroll > 0, 'Works page must be scrollable at the test viewport.');
  await frames();
  await page.locator('a[href="#work-site"]').first().evaluate((link) => link.click());
  await settled('work-site');
  assert.equal(await page.locator('#main-content').evaluate((main) => main.scrollTop), 0, 'New view must start at the top.');
  await page.locator('a[href="#works"]').first().evaluate((link) => link.click());
  await settled('works');
  assert(Math.abs(await page.locator('#main-content').evaluate((main) => main.scrollTop) - savedScroll) < 2, 'Return to works must restore scroll.');

  for (const [width, height] of [[360, 800], [390, 844], [768, 1024], [844, 390], [1366, 768], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await navigate(route);
      const overflow = await page.evaluate(() => {
        const main = document.getElementById('main-content');
        return Math.max(document.documentElement.scrollWidth - innerWidth, main.scrollWidth - main.clientWidth);
      });
      assert(overflow <= 1, `${route} overflows by ${overflow}px at ${width}x${height}.`);
    }
  }
  await checkFrames();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await navigate('top');
  await frames();
  const movingAnimations = await page.evaluate(() => document.getAnimations()
    .filter((animation) => animation.playState === 'running' && animation.effect.getTiming().duration > 1)
    .map((animation) => animation.animationName || 'transition'));
  assert.deepEqual(movingAnimations, [], 'Reduced motion must stop ambient and entrance animations.');

  for (const route of routes) {
    await page.goto(`${base}#${route}`);
    await settled(route, false);
    await frames();
    await checkFrames();
    assert(await page.title(), `${route} needs a document title.`);
  }
  await page.goto(`${base}#not-a-page`);
  await settled('top', false);
  await page.waitForURL(`${base}#top`);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'Unexpected persistent browser storage.');
  assert.deepEqual(await context.cookies(), [], 'Unexpected cookies.');
  assert.deepEqual(externalRequests, [], 'Unexpected external network requests.');
  assert.deepEqual(errors, [], 'Browser reported errors.');

  const screenshotDirectory = fileURLToPath(new URL('../.site-build/qa/', import.meta.url));
  await mkdir(screenshotDirectory, { recursive: true });
  for (const [label, width, height, views] of [
    ['desktop', 1440, 900, ['top', 'works', 'about', 'contact']],
    ['mobile', 390, 844, ['top', 'works']]
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of views) {
      await navigate(route);
      await page.locator('#main-content').evaluate((main) => { main.scrollTop = 0; });
      await page.screenshot({ path: path.join(screenshotDirectory, `${label}-${route}.png`) });
    }
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1366, height: 900 });
  await navigate('top');
  const cover = page.locator('.featured-work');
  const shape = cover.locator('.work-visual__shape');
  await cover.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => !document.getAnimations().some(a => a.animationName === 'paper-arrive' && a.playState === 'running'));
  const restTransform = await shape.evaluate(el => getComputedStyle(el).transform);
  await page.screenshot({ path: path.join(screenshotDirectory, 'cover-rest.png') });
  await cover.hover();
  await page.waitForFunction(() => {
    const matrix = new DOMMatrix(getComputedStyle(document.querySelector('.featured-work .work-visual__shape')).transform);
    return Math.hypot(matrix.a, matrix.b) > 1.1 && matrix.e < -10;
  });
  await page.screenshot({ path: path.join(screenshotDirectory, 'cover-hover.png') });
  await page.mouse.move(0, 0);
  await page.waitForFunction(rest => getComputedStyle(document.querySelector('.featured-work .work-visual__shape')).transform === rest, restTransform);
  await cover.hover();
  await cover.click();
  await settled('work-site');
  await page.waitForFunction(() => !document.querySelector('body > .work-visual') && !document.querySelector('.work-visual--hidden'));
  assert.deepEqual(errors, [], 'Hover-to-detail transition reported errors.');
  console.log('Passed: cover artwork moves and enlarges on hover, returns on leave, and opens the detail without leftover overlays.');
  for (const route of ['work-site', 'work-dashboard']) {
    await navigate('works');
    await page.waitForFunction(() => !document.querySelector('body > .work-visual') && !document.getAnimations().some(a => a.animationName === 'paper-arrive' && a.playState === 'running'));
    await page.mouse.move(0, 0);
    const card = page.locator(`.work-card[href="#${route}"]`);
    await card.hover();
    await page.waitForFunction(id => {
      const matrix = new DOMMatrix(getComputedStyle(document.querySelector(`.work-card[href="#${id}"] .work-visual__shape`)).transform);
      return Math.hypot(matrix.a, matrix.b) > 1.1 && matrix.e < -10;
    }, route);
    await page.screenshot({ path: path.join(screenshotDirectory, `${route}-hover.png`) });
    await card.click();
    await settled(route);
    await page.waitForFunction(() => !document.querySelector('body > .work-visual'));
  }
  const light = page.locator('.aurora--blue');
  await page.mouse.move(100, 100);
  await page.waitForFunction(() => !document.getAnimations().some(a => a.transitionProperty === 'transform' && a.playState === 'running'));
  const before = await light.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).e);
  await page.mouse.move(1200, 700);
  await page.waitForFunction(previous => new DOMMatrix(getComputedStyle(document.querySelector('.aurora--blue')).transform).e > previous + 900, before);
  await page.screenshot({ path: path.join(screenshotDirectory, 'pointer-gradient.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('.ambient.is-following'));
  assert.deepEqual(errors, [], 'Work card hover reported errors.');
  console.log('Passed: both work cards animate and open details; gradient follows the mouse and respects reduced motion.');
  console.log(`Screenshots: ${screenshotDirectory}`);
  console.log('Passed: 7 routes, rapid switching without page transparency, stable shell, links, back/forward, focus, scroll restoration, 6 viewport sizes, reduced motion, deep links, and isolated browser safety checks.');
} finally {
  await browser.close();
}
