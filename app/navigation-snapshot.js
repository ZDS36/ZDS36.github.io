export function intersectsViewport(node, viewport) {
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > viewport.top && rect.top < viewport.bottom;
}

export function canSnapshotMain(main) {
  if (main.querySelector('video, dialog[open]')) return false;
  const viewport = main.getBoundingClientRect();
  return !Array.from(main.querySelectorAll('iframe')).some(frame => intersectsViewport(frame, viewport));
}
