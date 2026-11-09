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
const routes = ['top', 'works', 'work-film', 'work-qingping', 'work-site', 'work-dashboard', 'slices', 'about', 'contact'];
const weatherDates = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
const weatherForecast = {
  current: { temperature_2m: 18, weather_code: 0, is_day: 1 },
  daily: {
    time: weatherDates,
    temperature_2m_min: [14, 12, 10, 8],
    temperature_2m_max: [20, 18, 17, 16],
    weather_code: [0, 3, 3, 61],
    precipitation_probability_max: [0, 10, 20, 75],
  },
  hourly: {
    time: weatherDates.flatMap(date => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`)),
    temperature_2m: Array.from({ length: 96 }, (_, hour) => 12 + (hour % 9)),
    precipitation_probability: Array.from({ length: 96 }, (_, hour) => hour >= 72 ? 75 : 0),
  },
};
const browser = await chromium.launch({ headless: true, chromiumSandbox: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });

try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
  const errors = [];
  const externalRequests = [];
  const videoRequests = [];
  const forecastCoordinates = [];
  context.on('request', request => { if (new URL(request.url()).pathname.endsWith('.mp4')) videoRequests.push(request.url()); });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base.origin) return route.continue();
    if (url.origin === 'https://ipwho.is') {
      assert.equal(url.searchParams.get('lang'), 'zh-CN');
      return route.fulfill({ json: { success: true, latitude: 31.2, longitude: 121.5, city: '上海', region: '浦东新区', country: '中国' } });
    }
    if (url.origin + url.pathname === 'https://api.open-meteo.com/v1/forecast') {
      assert.equal(url.searchParams.get('forecast_days'), '4');
      assert.equal(url.searchParams.get('timezone'), 'auto');
      forecastCoordinates.push([url.searchParams.get('latitude'), url.searchParams.get('longitude')]);
      return route.fulfill({ json: weatherForecast });
    }
    if (url.origin + url.pathname === 'https://geocoding-api.open-meteo.com/v1/search') {
      const name = url.searchParams.get('name');
      assert(['湛江', '湛江市'].includes(name));
      return route.fulfill({ json: name === '湛江' ? {} : {
        results: [{ id: 1784990, name: '湛江市', admin1: '广东', latitude: 21.23391, longitude: 110.38749 }],
      } });
    }
    // Navigation checks keep CAPTCHA offline; its submission behavior has separate tests.
    if (url.href === 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit') {
      return route.fulfill({ contentType: 'text/javascript', body: 'window.turnstile = { ready: fn => fn(), render: () => "navigation-widget", remove() {}, reset() {}, getResponse: () => "" };' });
    }
    externalRequests.push(url.origin);
    return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('download', () => errors.push('Unexpected download'));
  page.on('popup', () => errors.push('Unexpected popup'));
  await page.addInitScript(() => {
    window.transitionSoundStarts = 0;
    for (const nodeType of [AudioBufferSourceNode, OscillatorNode]) {
      const start = nodeType.prototype.start;
      nodeType.prototype.start = function (...args) {
        window.transitionSoundStarts++;
        return start.apply(this, args);
      };
    }
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
  const soundStarts = () => page.evaluate(() => window.transitionSoundStarts);
  const heardVoices = (before, count) => page.waitForFunction(
    expected => window.transitionSoundStarts === expected, before + count
  );
  const checkFrames = async () => {
    const result = await page.evaluate(() => window.navigationFrames);
    assert(result.checked > 0, 'No rendered frames sampled.');
    assert.deepEqual(result.failures, [], 'A whole view flashed transparent.');
  };

  await page.goto(new URL('/entrance.html', base).href, { waitUntil: 'commit' });
  const entrance = page.frameLocator('#site-entrance');
  await entrance.locator('#entry.building').waitFor();
  assert.equal(await entrance.locator('#skip, #replay').count(), 0, 'Entrance must not show skip or replay controls.');
  assert.equal(new URL(page.url()).hash, '', 'The address stays on the entrance until the visitor enters.');
  assert.equal(await page.locator('#root').evaluate(root => root.inert), true);
  await entrance.locator('#entry.finished').waitFor();
  const enter = entrance.getByRole('link', { name: '进入网站', exact: false });
  assert.equal(await enter.getAttribute('href'), '/#top');
  await page.evaluate(() => {
    window.sawStaggeredNavigation = false;
    const deadline = performance.now() + 4000;
    function sample() {
      if (!document.getElementById('site-entrance')) {
        const links = document.querySelectorAll('.primary-nav a');
        const opacity = node => Number(getComputedStyle(node).opacity);
        window.sawStaggeredNavigation = opacity(links[0]) > 0 && opacity(links[3]) === 0
          && opacity(document.querySelector('.home__title')) === 0;
      }
      if (!window.sawStaggeredNavigation && performance.now() < deadline) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  await enter.press('Enter');
  await entrance.locator('.loader-gather').waitFor();
  await entrance.locator('.loader-seam').waitFor({state: 'attached'});
  assert.equal(await page.locator('.primary-nav a').first().evaluate(link => getComputedStyle(link).opacity), '0');
  await page.locator('#site-entrance').waitFor({state: 'detached'});
  await settled('top', false);
  assert.equal(await page.locator('#root').evaluate(root => root.inert), false);
  assert.equal(await page.locator('.site-main').evaluate(main => document.activeElement === main), true);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.featured-work')).opacity === '1');
  assert.equal(await page.evaluate(() => window.sawStaggeredNavigation), true);
  console.log('Passed: root entrance, loading lockup, split and keyboard handoff to the mounted homepage.');
  assert.equal(await page.locator('.featured-work').getAttribute('href'), '#work-film');
  assert.equal(await page.locator('.work-card').count(), 4);
  assert.deepEqual(videoRequests, [], 'Homepage must not download the film.');
  const weather = page.getByRole('complementary', { name: '本地天气' });
  await weather.getByText('上海', { exact: true }).waitFor();
  assert.deepEqual(forecastCoordinates.at(-1), ['31.2', '121.5']);
  const weatherTrigger = weather.locator('summary');
  await weatherTrigger.getByText('估算', { exact: true }).waitFor();
  const weatherDays = weather.getByRole('group', { name: '预报日期' });
  assert.equal(await weatherTrigger.locator('.pixel-weather__sky').count(), 1);
  assert.equal(await weatherTrigger.locator('strong').textContent(), '18°');
  assert.doesNotMatch(await weatherTrigger.innerText(), /浦东|中国/);
  assert.equal(await weatherDays.count(), 0, 'Keep the forecast collapsed on arrival.');
  await weatherTrigger.press('Enter');
  assert.equal(await weatherDays.getByRole('button').count(), 4);
  assert.equal(await weatherDays.getByRole('button', { name: /^今天/ }).getAttribute('aria-pressed'), 'true');
  const lastDay = weatherDays.getByRole('button', { name: /^大后天/ });
  await lastDay.press('Enter');
  assert.equal(await lastDay.getAttribute('aria-pressed'), 'true');
  assert.match(await weather.innerText(), /最高降水概率 75%/);
  assert.equal(await weather.locator('.pixel-weather__bars:not(.pixel-weather__bars--rain) .pixel-weather__bar').count(), 24);
  assert.equal(await weather.locator('.pixel-weather__bars--rain .pixel-weather__bar').count(), 24);
  assert.equal(await weather.locator('.pixel-weather__bars--rain .pixel-weather__bar').first().evaluate(bar => bar.style.getPropertyValue('--level')), '0.75');
  assert.equal(await weatherTrigger.locator('.pixel-weather__fall').count(), 0, 'A later rainy day must not change the current sunny sprite.');
  await lastDay.press('Escape');
  assert.equal(await weather.locator('details').getAttribute('open'), null);
  assert.equal(await weatherTrigger.evaluate(trigger => document.activeElement === trigger), true);
  await page.locator('.featured-work').click();
  await settled('work-film');
  await page.waitForFunction(() => !document.querySelector('body > .work-visual, .work-visual--hidden'));
  const video = page.locator('.film-player video');
  assert.equal(await video.getAttribute('preload'), 'none');
  assert.equal(await video.evaluate(el => el.paused && el.controls && el.playsInline && !el.autoplay), true);
  assert.deepEqual(videoRequests, [], 'Film must wait for a playback request.');
  await video.evaluate(async el => { window.testFilm = el; await el.play(); });
  await page.waitForFunction(() => window.testFilm.currentTime > .2 && window.testFilm.videoWidth === 960);
  assert(Math.abs(await video.evaluate(el => el.duration) - 137.67) < .1, 'Film duration differs from the delivered cut.');
  await video.evaluate(el => { el.currentTime = 120; });
  await page.waitForFunction(() => !window.testFilm.seeking && window.testFilm.currentTime >= 120);
  await video.evaluate(el => el.pause());
  await page.locator('.back-link-v2').click();
  await settled('top');
  assert(await page.evaluate(() => window.testFilm.paused && !window.testFilm.isConnected), 'Leaving the film must stop playback.');
  console.log('Passed: film entry, no automatic video download/playback, actual decoding, seek and return cleanup.');
  await page.evaluate(() => { window.originalMain = document.getElementById('main-content'); });
  // A pending scroll frame must yield to a chapter selected in that same frame.
  await page.evaluate(() => {
    const main = document.getElementById('main-content');
    main.scrollTop = main.querySelector('[data-view="works"]').offsetTop;
    requestAnimationFrame(() => { location.hash = 'about'; });
    main.dispatchEvent(new Event('scroll'));
  });
  await settled('about');
  await navigate('top');
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

  for (const [width, height] of [[320, 740], [360, 800], [390, 844], [768, 1024], [844, 390], [1366, 768], [1920, 1080]]) {
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
  assert.equal(await page.evaluate(() => localStorage.length), 0, 'Unexpected persistent browser storage.');
  assert.deepEqual(await page.evaluate(() => Object.keys(sessionStorage).sort()), ['between-states.swarm.build', 'between-states.weather']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(`${base}?mobile-check`, { waitUntil: 'commit' });
  const mobileEntrance = page.frameLocator('#site-entrance');
  await mobileEntrance.locator('#entry.building').waitFor();
  assert.equal(await page.locator('.site-header').count(), 0, 'Mount the mobile homepage after the entrance assembles.');
  await mobileEntrance.getByRole('link', { name: '进入网站', exact: false }).click();
  await page.locator('#site-entrance').waitFor({ state: 'detached' });
  await settled('top', false);
  const header = page.locator('.site-header');
  assert.equal((await header.boundingBox()).height, 96);
  for (const control of await header.locator('a, button').all()) {
    assert((await control.boundingBox()).height >= 44, 'Keep mobile navigation targets at least 44px tall.');
  }

  await weatherTrigger.click();
  await weather.getByRole('searchbox', { name: '城市名称' }).fill('湛江');
  await weather.getByRole('button', { name: '搜索', exact: true }).click();
  await weather.getByRole('button', { name: '湛江市 · 广东' }).click();
  await weatherTrigger.getByText('湛江市', { exact: true }).waitFor();
  await weather.getByText('手动选择', { exact: true }).waitFor();
  assert.equal(await weatherTrigger.getByText('估算', { exact: true }).count(), 0);
  assert.deepEqual(forecastCoordinates.at(-1), ['21.23391', '110.38749']);
  await page.reload();
  await weatherTrigger.getByText('湛江市', { exact: true }).waitFor();
  await weatherTrigger.click();
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 21.23391, longitude: 110.38749 });
  await weather.getByRole('button', { name: '使用设备定位' }).click();
  await weatherTrigger.getByText('当前位置', { exact: true }).waitFor();
  assert.deepEqual(forecastCoordinates.at(-1), ['21.2', '110.4']);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('between-states.weather-city')), null);
  await weather.getByRole('button', { name: '恢复 IP 估算' }).click();
  await weatherTrigger.getByText('上海', { exact: true }).waitFor();
  await weatherTrigger.click();
  console.log('Passed: compact mobile header, deferred entrance mount, manual city search and device/IP weather switching.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  await page.evaluate(() => { window.originalRandom = Math.random; Math.random = () => 0; });
  for (const route of ['slices', 'about', 'contact', 'top']) {
    await page.locator(`.site-header a[href="#${route}"]`).first().click();
    await settled(route);
    const distance = await page.evaluate((route) => {
      const main = document.getElementById('main-content');
      return Math.abs(main.scrollTop - main.querySelector(`[data-view="${route}"]`).offsetTop);
    }, route);
    assert(distance < 2, `${route} failed to align with the viewport.`);
  }
  // Ink only covers the content, and rapid navigation keeps the latest destination.
  await page.waitForFunction(() => !document.querySelector('.ink-nav'));
  const beforeInkSound = await soundStarts();
  await page.locator('.site-header a[href="#works"]').click();
  await page.waitForFunction(() => document.getAnimations().some(a => a.animationName === 'ink-dissolve'));
  await heardVoices(beforeInkSound, 4);
  await page.waitForFunction(() => document.querySelector('.reading-progress').getAnimations().some(a => a.transitionProperty === 'transform'));
  const inkMotion = await page.evaluate(() => {
    const stage = document.querySelector('.ink-stage');
    const outgoing = document.getAnimations().find(a => a.animationName === 'ink-dissolve');
    const progress = document.querySelector('.reading-progress').getAnimations().find(a => a.transitionProperty === 'transform');
    return {
      duration: outgoing.effect.getTiming().duration,
      progressDuration: progress.effect.getTiming().duration,
      mask: getComputedStyle(stage, '::view-transition-old(root)').maskImage.includes('ink-opening'),
      incoming: getComputedStyle(stage, '::view-transition-new(root)').filter,
      pointer: getComputedStyle(stage, '::view-transition').pointerEvents
    };
  });
  assert.deepEqual(inkMotion, { duration: 1350, progressDuration: 650, mask: true, incoming: 'none', pointer: 'none' });
  await page.evaluate(() => {
    document.querySelector('.site-header a[href="#about"]').click();
    document.querySelector('.site-header a[href="#slices"]').click();
  });
  await settled('slices');
  await page.waitForFunction(() => !document.querySelector('.ink-nav'));
  assert.equal(await page.locator('.reading-progress').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
  await page.evaluate(() => {
    Math.random = () => .5;
    const frame = document.createElement('iframe');
    frame.id = 'offscreen-challenge';
    frame.srcdoc = '<p>Offscreen verification fixture</p>';
    document.querySelector('[data-view="contact"]').append(frame);
  });
  const beforeTearSound = await soundStarts();
  const handoff = await page.evaluate(() => {
    const outgoing = document.querySelector('#main-content .slices-page > :first-child');
    const position = { transform: 'translateY(19px)' };
    const motion = outgoing.animate([position, position], 1000);
    const mask = document.querySelector('.ink-stage > .chapter-mask');
    const appearance = { backdropFilter: 'blur(7px)', opacity: .7 };
    const blur = mask.animate([appearance, appearance], 1000);
    for (const animation of [motion, blur]) {
      animation.pause();
      animation.currentTime = 0;
    }
    const measure = (node, veil) => ({
      top: node.getBoundingClientRect().top,
      transform: getComputedStyle(node).transform,
      blur: getComputedStyle(veil).backdropFilter,
      opacity: getComputedStyle(veil).opacity,
    });
    const before = measure(outgoing, mask);
    document.querySelector('.site-header a[href="#about"]').click();
    const sheet = document.querySelector('.paper-sheet');
    const first = measure(sheet.querySelector('.slices-page > :first-child'), sheet.querySelector('.chapter-mask'));
    motion.cancel();
    blur.cancel();
    return { before, first, clip: getComputedStyle(sheet).clipPath };
  });
  assert.equal(handoff.before.transform, 'matrix(1, 0, 0, 1, 0, 19)');
  assert.equal(handoff.before.blur, 'blur(7px)');
  assert.deepEqual(handoff.first, handoff.before, 'The outgoing page must keep its appearance on the first tear frame.');
  assert.equal(handoff.clip, 'none', 'The first frame must be an intact sheet.');
  await heardVoices(beforeTearSound, 6);
  await settled('about');
  await page.waitForFunction(() => {
    const overlay = document.querySelector('.paper-tear');
    return overlay?.inert && overlay.querySelectorAll('.paper-sheet').length === 2
      && [...overlay.querySelectorAll('.paper-edge path')].every(path => path.getAttribute('d')?.length > 50)
      && !overlay.querySelector('iframe[src], iframe[srcdoc]')
      && !document.querySelector('.ink-nav');
  });
  await page.evaluate(() => {
    document.querySelector('.site-header a[href="#works"]').click();
    document.querySelector('.site-header a[href="#top"]').click();
  });
  await settled('top');
  await page.waitForFunction(() => !document.querySelector('.paper-tear'));
  await page.evaluate(() => { Math.random = () => .99; });
  const beforeShredSound = await soundStarts();
  await page.locator('.site-header a[href="#works"]').click();
  await settled('works');
  await page.waitForFunction(() => {
    const layer = document.querySelector('.paper-shred-layer');
    return layer?.dataset.direction === 'right' && layer.width > 0
      && !document.querySelector('.ink-nav, .paper-tear');
  });
  await heardVoices(beforeShredSound, 18);
  await page.waitForFunction(() => !document.querySelector('.paper-shred-layer'));
  await page.evaluate(() => {
    document.getElementById('offscreen-challenge').remove();
    Math.random = window.originalRandom;
  });
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
  // Scrub the capsule and its companion motions in both directions during a cinematic transition.
  await navigate('top');
  await page.waitForFunction(() => !document.querySelector('.ink-nav, .paper-tear, .paper-shred-layer'));
  await page.evaluate(() => { window.glassIndicator = document.querySelector('.primary-nav__indicator'); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => !document.querySelector('.primary-nav__indicator').getAnimations().length);
  await page.evaluate(() => { Math.random = () => .5; });
  for (const [route, direction] of [['about', 1], ['top', -1]]) {
    const motion = await page.evaluate(async route => {
      const lens = window.glassIndicator;
      const link = document.querySelector(`.primary-nav a[href="#${route}"]`);
      const icon = link.querySelector('svg');
      const content = document.querySelector(`#main-content [data-view="${route}"] > :first-child`);
      const start = lens.getBoundingClientRect();
      link.click();
      await new Promise(requestAnimationFrame);
      const animations = [
        ...lens.getAnimations().filter(a => a.transitionProperty?.startsWith('--nav-')),
        ...content.getAnimations().filter(a => a.animationName === 'tab-arrive'),
        ...icon.getAnimations(),
      ];
      const seek = time => animations.forEach(a => { a.currentTime = time; });
      seek(140);
      const middle = lens.getBoundingClientRect();
      const { opacity, transform } = getComputedStyle(content);
      seek(100);
      const shrink = new DOMMatrixReadOnly(getComputedStyle(icon).transform).a;
      seek(260);
      const pop = new DOMMatrixReadOnly(getComputedStyle(icon).transform).a;
      seek(308);
      const bounce = lens.getBoundingClientRect();
      const target = link.getBoundingClientRect();
      animations.forEach(a => a.finish());
      return {
        left: middle.left - start.left, right: middle.right - start.right,
        stretch: middle.width - start.width, flatten: start.height - middle.height,
        overshoot: (bounce.left + bounce.right - target.left - target.right) / 2,
        shift: new DOMMatrixReadOnly(transform).e, opacity: Number(opacity), shrink, pop,
        durations: animations.map(a => a.effect.getTiming().duration),
        paperActive: Boolean(document.querySelector('.paper-tear')),
      };
    }, route);
    assert.deepEqual(motion.durations, [400, 400, 400, 400]);
    assert(motion.right > motion.left && motion.left * direction > 0 && motion.right * direction > 0);
    assert(motion.stretch > 10 && motion.flatten > 2 && motion.overshoot * direction > .5);
    assert(motion.shift * direction > 0 && motion.opacity > .78 && motion.opacity < 1);
    assert(motion.shrink < .85 && motion.pop > 1.08 && motion.paperActive);
    await settled(route);
    await page.waitForFunction(() => !document.querySelector('.paper-tear'));
  }
  await page.evaluate(() => { Math.random = window.originalRandom; });
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
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const safeArea = await context.newCDPSession(page);
  try {
    await safeArea.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47 } });
    const geometry = await page.evaluate(() => {
      const header = document.querySelector('.site-header');
      const mainTop = document.querySelector('.site-main').getBoundingClientRect().top;
      const navBottom = header.querySelector('.primary-nav').getBoundingClientRect().bottom;
      const progressBottom = document.querySelector('.reading-progress').getBoundingClientRect().bottom;
      return { padding: parseFloat(getComputedStyle(header).paddingTop), mainTop, navBottom, progressBottom };
    });
    assert.equal(geometry.padding, 47);
    assert(geometry.navBottom <= geometry.mainTop, 'Phone safe area must not push navigation over the page.');
    assert.equal(geometry.progressBottom, geometry.mainTop, 'Reading progress must follow the padded header.');
  } finally {
    await safeArea.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0 } });
    await safeArea.detach();
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
  await navigate('slices');
  assert.equal(await page.locator('.primary-nav a[href="#slices"]').innerText(), '年轮');
  assert.equal(await page.locator('[data-view="slices"] h1').innerText(), '年轮');
  assert((await page.locator('.moment-card').count()) > 0, 'Time tree needs real entries.');
  const dates = await page.locator('.moment__date').evaluateAll(nodes => nodes.map(node => node.dateTime));
  assert.deepEqual(dates, [...dates].sort().reverse(), 'Backdated moments must sort by their actual dates.');
  await page.locator('.timeline-index button').first().click();
  assert.equal(await page.evaluate(() => location.hash), '#slices', 'Month navigation must keep the chapter address.');
  assert(await page.locator('.time-tree__month').first().evaluate(node => {
    const main = document.getElementById('main-content').getBoundingClientRect();
    const target = node.getBoundingClientRect();
    return target.top >= main.top && target.top < main.bottom;
  }), 'Month button must bring the target month into view.');
  const thumbnail = page.locator('.moment-photos button').first();
  await thumbnail.scrollIntoViewIfNeeded();
  const beforePhoto = await page.locator('#main-content').evaluate(main => main.scrollTop);
  await thumbnail.click();
  await page.waitForSelector('.photo-viewer[open]');
  assert(await page.locator('.photo-viewer img').evaluate(image => image.complete && image.naturalWidth > 0), 'Full photo failed to load.');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.photo-viewer').open);
  assert(await thumbnail.evaluate(node => document.activeElement === node), 'Closing photo must return focus to its thumbnail.');
  assert(Math.abs(await page.locator('#main-content').evaluate(main => main.scrollTop) - beforePhoto) < 2, 'Photo viewing changed the reading position.');
  await thumbnail.click();
  await page.locator('.photo-viewer button').click();
  assert.equal(await page.locator('.photo-viewer').evaluate(node => node.open), false);
  await thumbnail.click();
  await navigate('about');
  assert.equal(await page.locator('.photo-viewer').evaluate(node => node.open), false, 'Photo must close when changing chapters.');
  for (const [label, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 900]]) {
    await page.setViewportSize({ width, height });
    await navigate('slices');
    await page.screenshot({ path: path.join(screenshotDirectory, `rings-${label}.png`) });
    await page.locator('.time-tree').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshotDirectory, `rings-tree-${label}.png`) });
    assert(await page.locator('#main-content').evaluate(main => main.scrollWidth <= main.clientWidth + 1));
  }
  assert.deepEqual(errors, [], 'Time tree or photo viewer reported errors.');
  assert.deepEqual(externalRequests, [], 'Time tree must use local assets.');
  console.log('Passed: time-tree dates, year/month index, photo loading, Escape, close button, focus/scroll restoration and navigation cleanup.');

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'no-preference' });
  await page.reload();
  const themeButton = page.getByRole('switch', { name: '夜晚模式' });
  const theme = () => page.locator('html').getAttribute('data-theme');
  await themeButton.waitFor();
  assert.equal(await theme(), 'dark');
  assert.equal(await themeButton.innerText(), '', 'Theme switch must only show icons.');
  const thumb = themeButton.locator('.theme-toggle__thumb');
  assert.equal(await thumb.evaluate(node => getComputedStyle(node).transitionDuration), '0.33s');
  const nightThumb = await thumb.boundingBox();
  const beforeTheme = await page.evaluate(() => ({ hash: location.hash, scroll: document.querySelector('main').scrollTop }));
  await themeButton.focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => document.querySelector('.theme-toggle__thumb').getAnimations().some(animation => animation.transitionProperty === 'transform'));
  await page.waitForFunction(() => document.getAnimations().some(animation => animation.animationName === 'theme-reveal'));
  assert.equal(await page.evaluate(() => document.getAnimations().find(animation => animation.animationName === 'theme-reveal').effect.getTiming().duration), 760);
  assert(await themeButton.evaluate(button => {
    const { left, top, width, height } = button.getBoundingClientRect();
    const root = document.documentElement;
    const [x, y] = root.style.getPropertyValue('--theme-origin').split(' ').map(parseFloat);
    const radius = parseFloat(root.style.getPropertyValue('--theme-radius'));
    return x === left + width / 2 && y === top + height / 2
      && radius >= Math.hypot(Math.max(x, root.clientWidth - x), Math.max(y, root.clientHeight - y));
  }), 'Theme reveal must start at the button and reach the farthest corner.');
  await page.waitForFunction(() => !document.documentElement.classList.contains('theme-reveal'));
  assert.equal(await theme(), 'light');
  assert.equal(await themeButton.getAttribute('aria-checked'), 'false');
  assert(Math.abs(nightThumb.x - (await thumb.boundingBox()).x - nightThumb.width) < 1, 'Theme thumb must travel one segment.');
  assert.deepEqual(await page.evaluate(() => ({ hash: location.hash, scroll: document.querySelector('main').scrollTop })), beforeTheme);
  await page.reload();
  assert.equal(await theme(), 'light', 'Theme choice must survive a reload.');

  await themeButton.click();
  await page.waitForFunction(() => document.getAnimations().some(animation => animation.animationName === 'theme-reveal'));
  await page.waitForFunction(() => !document.documentElement.classList.contains('theme-reveal'));
  assert.equal(await theme(), 'dark');
  await themeButton.evaluate(button => {
    button.click();
    if (button.getAttribute('aria-checked') !== 'false') throw new Error('Switch must respond before the page snapshot.');
    button.click();
  });
  assert.equal(await themeButton.getAttribute('aria-checked'), 'true');
  assert.equal(await theme(), 'dark', 'A reversal before the snapshot must retain the requested theme.');
  await themeButton.click();
  await page.waitForFunction(() => document.getAnimations().some(animation => animation.animationName === 'theme-reveal'));
  await themeButton.click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('theme-reveal'));
  assert.equal(await theme(), 'dark', 'A reversal during the reveal must apply the latest theme.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await themeButton.click();
  assert.equal(await theme(), 'light');
  assert(!await page.locator('html').evaluate(root => root.classList.contains('theme-reveal')));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { document.startViewTransition = undefined; });
  await themeButton.click();
  assert.equal(await theme(), 'dark', 'Theme must change without View Transitions support.');
  console.log('Passed: immediate theme switch feedback, two-way reveal, rapid reversal, keyboard, persistence, reduced motion and API fallback.');

  assert.deepEqual(errors, [], 'Navigation or theme switching reported errors.');
  console.log('Passed: glass indicator interpolation, rapid reversal, persistent DOM, 4 responsive widths, keyboard links and reduced motion.');
  console.log('Passed: continuous scrolling, parallax, stable DOM/focus/history, all three randomized transitions, progress interpolation, rapid navigation and reduced motion.');
  console.log(`Passed: ${routes.length} routes, rapid switching, stable shell, links, back/forward, focus, scroll restoration, 6 viewport sizes, deep links, and isolated browser safety checks.`);
} finally {
  await browser.close();
}
