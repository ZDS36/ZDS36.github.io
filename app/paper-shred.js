import './paper-shred.css';
import avatarUrl from './avatar.jpg';
import { canSnapshotMain, cloneVisibleMain } from './navigation-snapshot.js';
import { createShred } from './shred-motion.js';

const directions = ['top', 'bottom', 'left', 'right'];
const overlay = document.createElement('canvas');
overlay.className = 'paper-shred-layer';
overlay.setAttribute('aria-hidden', 'true');
const avatar = new Image();
avatar.src = avatarUrl;
let effect;
let avatarData;

async function freezeImage(image, limit) {
  if (!image.complete || !image.naturalWidth) return '';
  const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
  const still = document.createElement('canvas');
  still.width = Math.max(1, Math.round(image.naturalWidth * scale));
  still.height = Math.max(1, Math.round(image.naturalHeight * scale));
  still.getContext('2d').drawImage(image, 0, 0, still.width, still.height);
  const blob = await new Promise(resolve => still.toBlob(resolve, 'image/webp', .9));
  if (!blob) return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function snapshotStyles(width, viewportHeight, avatarData) {
  const avatarPath = new URL(avatarUrl, location.href).pathname;
  const css = Array.from(document.styleSheets, sheet => {
    if (sheet.href && new URL(sheet.href).origin !== location.origin) return '';
    return Array.from(sheet.cssRules, rule => rule.cssText).join('\n')
      .replace(/url\(["']?([^"')]+)["']?\)|(\d*\.?\d+)(d?vh|vw)\b/g, (token, url, amount, unit) => {
        if (unit) return `${Number(amount) * (unit === 'vw' ? width : viewportHeight) / 100}px`;
        if (avatarData && new URL(url, sheet.href || location.href).pathname === avatarPath) return `url("${avatarData}")`;
        return token;
      });
  }).join('\n');
  return css + '\n*,*::before,*::after{animation:none!important;transition:none!important}';
}

// shortcut: SVG captures local HTML and still images, use a native pixel capture for visible live media.
async function snapshot(stage, main, width, height, density) {
  const clone = stage.cloneNode(false);
  const { copy: scroller, images } = cloneVisibleMain(main);
  const ambient = stage.querySelector('.ambient').cloneNode(true);
  clone.append(ambient, scroller);
  const shell = stage.parentElement.cloneNode(false);
  shell.style.cssText += ';display:block;height:100%;color:var(--paper);font-size:1rem;line-height:1.65';
  shell.append(clone);
  clone.style.height = '100%';
  scroller.style.cssText = `width:${main.clientWidth}px;overflow:hidden;scrollbar-width:none;`;
  scroller.firstElementChild.style.top = `${-main.scrollTop}px`;
  const bounds = main.getBoundingClientRect();
  const frozenImages = images.map(async ([source, copy]) => {
    const rect = source.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 && rect.bottom > bounds.top && rect.top < bounds.bottom;
    const src = visible ? await freezeImage(source, width <= 600 ? 640 : 1000) : '';
    copy.removeAttribute('loading');
    copy.removeAttribute('srcset');
    if (src) {
      copy.src = src;
    } else {
      copy.removeAttribute('src');
      copy.removeAttribute('alt');
      copy.style.visibility = 'hidden';
      if (visible) {
        copy.style.width = `${rect.width}px`;
        copy.style.height = `${rect.height}px`;
      }
    }
  });
  clone.querySelectorAll('iframe').forEach(frame => {
    frame.removeAttribute('src');
    frame.removeAttribute('srcdoc');
  });
  const lights = stage.querySelectorAll('.aurora');
  clone.querySelectorAll('.aurora').forEach((light, index) => {
    light.style.transform = getComputedStyle(lights[index]).transform;
  });

  const svgNS = 'http://www.w3.org/2000/svg';
  const viewportHeight = window.innerHeight;
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', viewportHeight);
  svg.setAttribute('viewBox', `0 0 ${width} ${viewportHeight}`);
  svg.setAttribute('data-theme', document.documentElement.dataset.theme);
  const foreign = document.createElementNS(svgNS, 'foreignObject');
  foreign.setAttribute('width', width);
  foreign.setAttribute('height', height);
  const style = document.createElement('style');
  if (avatar.complete && avatar.naturalWidth) avatarData ??= freezeImage(avatar, 640);
  const [avatarImage] = await Promise.all([avatarData, ...frozenImages]);
  style.textContent = snapshotStyles(width, viewportHeight, avatarImage);
  foreign.append(style, shell);
  svg.append(foreign);

  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  await image.decode();
  const texture = document.createElement('canvas');
  texture.width = Math.round(width * density);
  texture.height = Math.round(height * density);
  texture.getContext('2d').drawImage(image, 0, 0, texture.width, Math.round(viewportHeight * density));
  return texture;
}

export const paperShredTransition = {
  supports({ main }) {
    if (!canSnapshotMain(main)) return false;
    if (effect === undefined) effect = createShred(overlay);
    return effect && !effect.lost();
  },
  start({ stage, main }, commit) {
    const { width, height } = stage.getBoundingClientRect();
    const density = Math.min(devicePixelRatio, width <= 600 ? 1.25 : 1.5);
    const scrollTop = main.scrollTop;
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const strips = effect.makeStrips();
    let frame;
    let complete;
    let stopped = false;
    const finished = new Promise(resolve => { complete = resolve; });
    const cancel = () => {
      if (stopped) return;
      stopped = true;
      clearTimeout(deadline);
      cancelAnimationFrame(frame);
      overlay.remove();
      complete();
    };
    const deadline = setTimeout(cancel, 600);

    snapshot(stage, main, width, height, density).then(texture => {
      if (stopped || effect.lost() || Math.abs(main.scrollTop - scrollTop) > 2) return cancel();
      clearTimeout(deadline);
      overlay.width = texture.width;
      overlay.height = texture.height;
      overlay.dataset.direction = direction;
      effect.size(width, height);
      effect.load(texture);
      stage.append(overlay);
      effect.draw(direction, 0, strips);
      commit();
      const start = performance.now();
      let lastDraw = start;
      function tick(now) {
        const elapsed = Math.max(0, now - start);
        if (elapsed >= effect.duration || effect.lost()) return cancel();
        if (now - lastDraw >= 15) {
          effect.draw(direction, elapsed / 1000, strips);
          lastDraw = now;
        }
        frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }).catch(cancel);
    return { finished, cancel };
  }
};
