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
const routes = ['top', 'works', 'work-film', 'work-site', 'work-dashboard', 'slices', 'about', 'contact'];
const browser = await chromium.launch({ headless: true, chromiumSandbox: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const errors = [];
  const externalRequests = [];
  const videoRequests = [];
  context.on('request', request => { if (new URL(request.url()).pathname.endsWith('.mp4')) videoRequests.push(request.url()); });
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
      const target = document.querySelector(`[data-view="${route}"]`);
      return views.length === (route.startsWith('work-') ? 1 : 5) && target
        && location.hash === `#${route}`
        && (!focus || document.activeElement === target.querySelector('h1'));
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
  assert.equal(await page.locator('.featured-work').getAttribute('href'), '#work-film');
  assert.equal(await page.locator('.work-card').count(), 3);
  assert.deepEqual(videoRequests, [], 'Homepage must not download the film.');
  await page.locator('.featured-work').click();
  await settled('work-film');
  await page.waitForFunction(() => !document.querySelector('body > .work-visual, .work-visual--hidden'));
  const video = page.locator('.film-player video');
  assert.equal(await video.getAttribute('preload'), 'none');
  assert.equal(await video.evaluate(el => el.paused && el.controls && el.playsInline && !el.autoplay), true);
  assert.deepEqual(videoRequests, [], 'Film must wait for a playback request.');
  await video.evaluate(async el => { window.testFilm = el; await el.play(); });
  await page.waitForFunction(() => window.testFilm.currentTime > .2 && window.testFilm.videoWidth === 1600);
  assert(Math.abs(await video.evaluate(el => el.duration) - 137.67) < .1, 'Film duration differs from the delivered cut.');
  await video.evaluate(el => { el.currentTime = 120; });
  await page.waitForFunction(() => !window.testFilm.seeking && window.testFilm.currentTime >= 120);
  await video.evaluate(el => el.pause());
  await page.locator('.back-link-v2').click();
  await settled('top');
  assert(await page.evaluate(() => window.testFilm.paused && !window.testFilm.isConnected), 'Leaving the film must stop playback.');
  console.log('Passed: film entry, no automatic video download/playback, actual decoding, seek and return cleanup.');
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
    main.scrollTop = main.querySelector('[data-view="works"]').offsetTop + 180;
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
      if (route === 'work-film' && width >= 801 && height >= 700) {
        const playerBottom = await page.locator('.film-player').evaluate(el => el.getBoundingClientRect().bottom);
        assert(playerBottom <= height + 1, `Film controls fall below the first screen at ${width}x${height}.`);
      }
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
    ['desktop', 1440, 900, ['top', 'works', 'work-film', 'about', 'contact']],
    ['mobile', 390, 844, ['top', 'works', 'work-film']]
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of views) {
      await navigate(route);
      await page.locator('#main-content').evaluate((main, route) => { main.scrollTop = main.querySelector(`[data-view="${route}"]`).offsetTop; }, route);
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
    return Math.hypot(matrix.a, matrix.b) > 1.03 && matrix.e < -1;
  });
  await page.screenshot({ path: path.join(screenshotDirectory, 'cover-hover.png') });
  await page.mouse.move(0, 0);
  await page.waitForFunction(rest => getComputedStyle(document.querySelector('.featured-work .work-visual__shape')).transform === rest, restTransform);
  await cover.hover();
  await cover.click();
  await settled('work-film');
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
  // Real wheel scrolling must reach the next chapter without remounting or stealing focus.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1366, height: 768 });
  await navigate('top');
  await page.evaluate(() => {
    window.archiveNode = document.querySelector('.archive');
    window.scrollHistoryLength = history.length;
    window.scrollFocus = document.activeElement;
    window.startDepth = document.querySelector('.app-shell').style.getPropertyValue('--depth');
  });
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 1150);
  await settled('works', false);
  assert(await page.evaluate(() => window.archiveNode === document.querySelector('.archive')), 'Scroll remounted archive.');
  assert(await page.evaluate(() => window.scrollFocus === document.activeElement), 'Scroll stole focus.');
  assert(await page.evaluate(() => window.scrollHistoryLength === history.length), 'Scroll polluted history.');
  assert(await page.evaluate(() => window.startDepth !== document.querySelector('.app-shell').style.getPropertyValue('--depth')), 'Parallax did not respond to scroll.');
  assert.equal(await page.locator('.primary-nav [aria-current="page"]').getAttribute('href'), '#works');
  for (const route of ['slices', 'about', 'contact', 'top']) {
    await page.locator(`.site-header a[href="#${route}"]`).first().click();
    await settled(route);
    const distance = await page.evaluate((route) => {
      const main = document.getElementById('main-content');
      return Math.abs(main.scrollTop - main.querySelector(`[data-view="${route}"]`).offsetTop);
    }, route);
    assert(distance < 2, `${route} failed to align with the viewport.`);
  }
  // A mask is decorative even while running, and repeated navigation cancels its predecessor.
  await page.locator('.site-header a[href="#works"]').click();
  const mask = await page.locator('.chapter-mask').evaluate(el => ({
    pointer: getComputedStyle(el).pointerEvents,
    running: el.getAnimations().some(a => a.playState === 'running'),
    blur: el.getAnimations()[0]?.effect.getKeyframes().map(frame => frame.backdropFilter),
    transform: getComputedStyle(el).transform
  }));
  assert.deepEqual(mask, { pointer: 'none', running: true, blur: ['blur(10px)', 'blur(0px)'], transform: 'none' });
  await page.locator('.site-header a[href="#about"]').click();
  await settled('about');
  await page.waitForFunction(() => !document.querySelector('.chapter-mask').getAnimations().length);
  assert(await page.locator('.chapter-mask').evaluate(el => getComputedStyle(el).opacity === '0' && getComputedStyle(el).backdropFilter === 'none'), 'Blur remained over content.');
  await navigate('top');
  await page.waitForFunction(() => !document.querySelector('.chapter-mask').getAnimations().length);
  await page.locator('.featured-work').click();
  await settled('work-film');
  await page.locator('#main-content').evaluate(main => { main.scrollTop = 220; });
  await page.waitForFunction(() => !document.querySelector('body > .work-visual, .work-visual--hidden'));
  await page.locator('.site-header a[href="#about"]').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => !document.querySelector('.chapter-mask').getAnimations().length);
  await page.locator('.site-header a[href="#slices"]').click();
  await settled('slices');
  await frames();
  assert.equal(await page.locator('.chapter-mask').evaluate(el => getComputedStyle(el).display), 'none');
  assert.equal(await page.locator('.app-shell').evaluate(el => el.style.getPropertyValue('--depth')), '0px');
  assert.deepEqual(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName || 'WAAPI')), []);
  assert.deepEqual(errors, [], 'Scroll navigation reported errors.');
  assert.deepEqual(externalRequests, [], 'Unexpected external requests.');
  // The glass indicator stays mounted and interpolates instead of jumping between links.
  await navigate('top');
  await page.evaluate(() => { window.glassIndicator = document.querySelector('.primary-nav__indicator'); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const travel = await page.evaluate(async () => {
    const indicator = document.querySelector('.primary-nav__indicator');
    const start = indicator.getBoundingClientRect().left;
    const end = document.querySelector('.primary-nav a[href="#about"]').getBoundingClientRect().left;
    document.querySelector('.primary-nav a[href="#about"]').click();
    for (let frame = 0; frame < 6; frame++) await new Promise(requestAnimationFrame);
    const style = getComputedStyle(indicator);
    return { start, middle: indicator.getBoundingClientRect().left, end,
      moving: indicator.classList.contains('is-moving'), filter: style.filter, color: style.backgroundColor };
  });
  assert(travel.middle > travel.start && travel.middle < travel.end, 'Glass indicator must interpolate between links.');
  assert(travel.moving && travel.filter !== 'none' && travel.filter !== 'blur(0px)', `Moving indicator needs motion blur: ${JSON.stringify(travel)}`);
  assert.notEqual(travel.color, 'rgba(0, 0, 0, 0)', 'Moving indicator needs a color tint.');
  for (const route of ['top', 'slices', 'works', 'about', 'top']) {
    await page.locator(`.primary-nav a[href="#${route}"]`).evaluate(link => link.click());
    await settled(route);
  }
  assert(await page.evaluate(() => window.glassIndicator === document.querySelector('.primary-nav__indicator')), 'Glass indicator remounted.');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['top', 'works', 'slices', 'about']) {
      await navigate(route);
      await page.waitForFunction(() => !document.querySelector('.primary-nav__indicator').getAnimations().some(a => a.playState === 'running'));
      const geometry = await page.evaluate(route => {
        const lens = document.querySelector('.primary-nav__indicator').getBoundingClientRect();
        const link = document.querySelector(`.primary-nav a[href="#${route}"]`).getBoundingClientRect();
        return { offset: Math.abs(lens.left - link.left), width: Math.abs(lens.width - link.width), target: link.height };
      }, route);
      assert(geometry.offset < 1 && geometry.width < 1 && geometry.target >= 44, `Glass geometry failed at ${width}px: ${JSON.stringify(geometry)}`);
      assert(await page.locator('.primary-nav__indicator').evaluate(el => !el.classList.contains('is-moving') && getComputedStyle(el).filter === 'none'), 'Indicator must settle sharply.');
    }
  }
  await page.locator('.primary-nav a[href="#top"]').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('href')), '#works');
  await page.keyboard.press('Enter');
  await settled('works');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await navigate('about');
  assert.equal(await page.locator('.primary-nav__indicator').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await navigate('contact');
  assert.equal(await page.locator('.primary-nav__indicator').evaluate(el => getComputedStyle(el).opacity), '0');
  await navigate('top');
  assert(await page.locator('.primary-nav').evaluate(el => {
    const style = getComputedStyle(el);
    return style.borderTopWidth === '0px' && style.backgroundImage === 'none' && style.boxShadow === 'none';
  }), 'Outer navigation frame must be absent.');
  await page.screenshot({ path: path.join(screenshotDirectory, 'glass-nav-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(screenshotDirectory, 'glass-nav-mobile.png') });
  assert.deepEqual(errors, [], 'Glass navigation reported errors.');
  console.log('Passed: glass indicator interpolation, rapid reversal, persistent DOM, 4 responsive widths, keyboard links and reduced motion.');
  console.log('Passed: continuous wheel scrolling, parallax, active navigation, stable DOM/focus/history, mask interruption and reduced motion.');
  console.log(`Passed: ${routes.length} routes, rapid switching, stable shell, links, back/forward, focus, scroll restoration, 6 viewport sizes, deep links, and isolated browser safety checks.`);
} finally {
  await browser.close();
}
