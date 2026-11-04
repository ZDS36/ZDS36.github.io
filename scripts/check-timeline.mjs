import assert from 'node:assert/strict';
import { groupMoments } from '../app/timeline.js';

const entries = [
  { id: 'new', date: '2026-11-04' },
  { id: 'past', date: '2024-02-29' },
  { id: 'same-day', date: '2026-11-04' },
  { id: 'earlier-month', date: '2026-01-01' },
  { id: 'same-month', date: '2026-11-01' },
  { id: 'middle-year', date: '2025-12-31' }
];
const original = entries.slice();
const tree = groupMoments(entries);
assert.deepEqual(tree.map(group => group.year), ['2026', '2025', '2024']);
assert.deepEqual(tree[0].months.map(group => group.month), ['11', '01']);
assert.deepEqual(tree[0].months[0].entries.map(entry => entry.id), ['new', 'same-day', 'same-month']);
assert.equal(tree[2].months[0].entries[0].id, 'past', 'Backdated entries belong to their actual date.');
assert.deepEqual(entries, original, 'Sorting must not mutate the content source.');
assert.deepEqual(groupMoments([]), []);
for (const date of ['2025-02-29', '2026-02-30', '2026-13-01', '2026-2-01', '', undefined]) {
  assert.throws(() => groupMoments([{ id: 'invalid', date }]), /日期无效/);
}
assert.throws(() => groupMoments([{ id: 'duplicate', date: '2026-01-01' }, { id: 'duplicate', date: '2026-02-01' }]), /唯一 id/);
console.log('Passed: time-tree grouping, backdated insertion, same-day stability, valid dates, unique ids and immutable input.');
