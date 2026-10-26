import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bytes = await readFile(new URL('../public/media/sunk-cost/film.mp4', import.meta.url));
const atoms = [];
for (let offset = 0; offset < bytes.length;) {
  assert(offset + 8 <= bytes.length, 'Truncated MP4 header');
  let size = bytes.readUInt32BE(offset);
  if (size === 1) size = Number(bytes.readBigUInt64BE(offset + 8));
  if (size === 0) size = bytes.length - offset;
  assert(size >= 8 && offset + size <= bytes.length, 'Invalid MP4 atom');
  atoms.push({ type: bytes.toString('ascii', offset + 4, offset + 8), offset });
  offset += size;
}
const moov = atoms.find(atom => atom.type === 'moov');
const mdat = atoms.find(atom => atom.type === 'mdat');
assert(moov && mdat && moov.offset < mdat.offset, 'Slow mobile start: MP4 playback index is after the video data');
assert(moov.offset < 256 * 1024, 'Playback metadata must fit in the initial request');
assert(bytes.length < 7 * 1024 * 1024, 'Default mobile film exceeds the 7 MB transfer budget');
console.log(`Film progressive loading passed: ${bytes.length} bytes, playback index at ${moov.offset}.`);
