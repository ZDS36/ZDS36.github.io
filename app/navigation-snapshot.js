export function intersectsViewport(node, viewport) {
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > viewport.top && rect.top < viewport.bottom;
}

export function canSnapshotMain(main) {
  if (main.querySelector('video, dialog[open]')) return false;
  const viewport = main.getBoundingClientRect();
  return !Array.from(main.querySelectorAll('iframe')).some(frame => intersectsViewport(frame, viewport));
}

export function cloneVisibleMain(main) {
  const viewport = main.getBoundingClientRect();
  const animations = main.getAnimations?.({ subtree: true }) ?? [];
  const animated = new Set(animations.map(animation => animation.effect?.target));
  const images = [];
  const cloneView = source => {
    const copy = source.cloneNode(true);
    const originals = source.querySelectorAll('img');
    copy.querySelectorAll('img').forEach((image, index) => images.push([originals[index], image]));
    if (animated.size) {
      const originals = [source, ...source.querySelectorAll('*')];
      const copies = [copy, ...copy.querySelectorAll('*')];
      originals.forEach((node, index) => {
        if (!animated.has(node)) return;
        const style = getComputedStyle(node);
        for (const property of ['transform', 'translate', 'scale', 'rotate', 'opacity', 'filter']) {
          copies[index].style.setProperty(property, style.getPropertyValue(property));
        }
      });
    }
    return copy;
  };

  const copy = main.cloneNode(false);
  const content = main.firstElementChild;
  if (content.classList.contains('archive')) {
    const archive = content.cloneNode(false);
    for (const section of content.children) {
      if (intersectsViewport(section, viewport)) {
        archive.append(cloneView(section));
      } else {
        // Keep the original scroll offset without laying out hidden chapters twice.
        const spacer = document.createElement('div');
        spacer.className = 'view';
        spacer.style.cssText = `height:${section.getBoundingClientRect().height}px;min-height:0;border:0`;
        archive.append(spacer);
      }
    }
    copy.append(archive);
  } else {
    copy.append(cloneView(content));
  }
  return { copy, images };
}
