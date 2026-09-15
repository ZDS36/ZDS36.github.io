import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const buildRoot = path.join(repositoryRoot, '.site-build');

const read = (relativePath) => readFile(path.join(repositoryRoot, relativePath), 'utf8');

const [sourceHtml, sourceJsx, sourceCss, viteConfig, builtHtml, builtJs, builtCss] = await Promise.all([
  read('app/index.html'),
  read('app/main.jsx'),
  read('app/styles.css'),
  read('vite.config.js'),
  read('.site-build/index.html'),
  read('.site-build/assets/site.js'),
  read('.site-build/assets/site.css')
]);

const allText = [sourceHtml, sourceJsx, sourceCss, builtHtml, builtJs, builtCss].join('\n');

requireMarker(viteConfig, 'emptyOutDir: false', 'Safe build configuration');

function requireMarker(text, marker, label) {
  if (!text.includes(marker)) {
    throw new Error(`${label} is missing: ${marker}`);
  }
}

for (const requiredCopy of ['张刀宋', '关于我', '我的切片', '联系方式', '联系我']) {
  requireMarker(sourceHtml + sourceJsx, requiredCopy, 'Site copy');
}

for (const forbiddenCopy of ['选择一个入口', '薛定谔', '\uFFFD']) {
  if (allText.includes(forbiddenCopy)) {
    throw new Error(`Site contains forbidden or corrupted copy: ${forbiddenCopy}`);
  }
}

for (const route of ['top', 'about', 'slices', 'contact']) {
  requireMarker(sourceJsx, route, 'Route source');
}

requireMarker(sourceJsx, 'main.scrollTop = 0', 'Route scroll reset');
requireMarker(sourceJsx, '<a className="back-link" href="#top">', 'Visible return link');
requireMarker(sourceJsx, "import avatarUrl from './avatar.jpg'", 'Avatar source');
requireMarker(sourceJsx, 'className="portrait__image"', 'Avatar image');

for (const cssMarker of [
  '.liquid-action',
  'backdrop-filter: blur(18px)',
  '.aurora--blue',
  '.aurora--cyan',
  '.aurora--violet',
  '.aurora--coral',
  '.aurora--amber',
  '--rose: #c96f88',
  '--copper: #c8875c',
  "feTurbulence type='fractalNoise'",
  '@keyframes micro-drift',
  '@keyframes ambient-drift',
  '@keyframes light-sweep',
  '@keyframes surface-shimmer',
  'animation: ambient-drift var(--drift-duration',
  '.aurora--amber.is-sweeping',
  '.aurora--coral.is-shimmering',
  'position: fixed',
  'route-enter 240ms cubic-bezier(0.2, 0.8, 0.2, 1) backwards',
  'overflow-x: hidden',
  '@media (prefers-reduced-motion: reduce)'
]) {
  requireMarker(sourceCss, cssMarker, 'Visual system');
}

for (const productionMarker of ['id="root"', '/assets/site.js', '/assets/site.css']) {
  requireMarker(builtHtml, productionMarker, 'Production HTML');
}

for (const developmentMarker of ['/main.jsx', '@vite/client', 'localhost']) {
  if (builtHtml.includes(developmentMarker)) {
    throw new Error(`Production HTML contains development marker: ${developmentMarker}`);
  }
}

const assetDirectory = path.join(buildRoot, 'assets');
const assetNames = (await readdir(assetDirectory)).sort();
const expectedAssetNames = ['site.css', 'site.jpg', 'site.js'];

if (JSON.stringify(assetNames) !== JSON.stringify(expectedAssetNames)) {
  throw new Error(`Unexpected production assets: ${assetNames.join(', ')}`);
}

for (const relativePath of ['.site-build/index.html', '.site-build/assets/site.js', '.site-build/assets/site.css', '.site-build/assets/site.jpg']) {
  const fileStat = await stat(path.join(repositoryRoot, relativePath));
  if (!fileStat.isFile() || fileStat.size < 64) {
    throw new Error(`Production file is missing or unexpectedly small: ${relativePath}`);
  }
}

console.log('Site source and isolated production build passed validation.');
