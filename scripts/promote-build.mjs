import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const buildRoot = path.join(repositoryRoot, '.site-build');

const files = [
  ['index.html', 'index.html'],
  [path.join('assets', 'site.js'), path.join('assets', 'site.js')],
  [path.join('assets', 'site.css'), path.join('assets', 'site.css')]
];

function assertInside(base, candidate, label) {
  const relative = path.relative(base, candidate);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} is outside its allowed directory.`);
  }
}

const builtHtmlPath = path.join(buildRoot, 'index.html');
const builtHtml = await readFile(builtHtmlPath, 'utf8');

for (const forbiddenMarker of ['/main.jsx', '@vite/client', 'localhost']) {
  if (builtHtml.includes(forbiddenMarker)) {
    throw new Error(`Build contains development marker: ${forbiddenMarker}`);
  }
}

for (const requiredMarker of ['id="root"', '/assets/site.js', '/assets/site.css']) {
  if (!builtHtml.includes(requiredMarker)) {
    throw new Error(`Build is missing required marker: ${requiredMarker}`);
  }
}

for (const [sourceRelative, destinationRelative] of files) {
  const source = path.resolve(buildRoot, sourceRelative);
  const destination = path.resolve(repositoryRoot, destinationRelative);

  assertInside(buildRoot, source, 'Build source');
  assertInside(repositoryRoot, destination, 'Publish destination');

  const sourceStat = await stat(source);
  if (!sourceStat.isFile() || sourceStat.size < 64) {
    throw new Error(`Build output is missing or unexpectedly small: ${sourceRelative}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

console.log('Validated build and updated the three GitHub Pages files.');
