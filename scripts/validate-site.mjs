import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const buildRoot = path.join(repositoryRoot, '.site-build');

const read = async (relativePath) => new TextDecoder('utf-8', { fatal: true })
  .decode(await readFile(path.join(repositoryRoot, relativePath)));

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

for (const requiredCopy of ['张刀宋', '作品', '切片', '关于', '联系我', '未定态', '课程面板']) {
  requireMarker(sourceHtml + sourceJsx, requiredCopy, 'Site copy');
}

for (const forbiddenCopy of ['选择一个入口', '薛定谔', '\uFFFD']) {
  if (allText.includes(forbiddenCopy)) {
    throw new Error(`Site contains forbidden or corrupted copy: ${forbiddenCopy}`);
  }
}

for (const route of ['top', 'works', 'work-site', 'work-dashboard', 'slices', 'about', 'contact']) {
  requireMarker(sourceJsx, route, 'Route source');
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
