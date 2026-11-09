import './paper-tear.css';
import { canSnapshotMain } from './navigation-snapshot.js';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

const seam = Array.from({ length: 241 }, (_, index) => {
  const y = index * 104 / 240 - 2;
  const t = y / 100;
  const curve = 77 - 40 * t - 14 * Math.sin(2 * Math.PI * t) + 6 * Math.sin(Math.PI * t);
  const tooth = Math.sin(index * 8.15) * .36 + Math.sin(index * 2.89) * .31;
  return { x: curve + .85 * Math.sin(y * .36) + tooth, y: y.toFixed(2), position: y };
});

function playPaperTear(stage, main) {
  const overlay = document.createElement('div');
  overlay.className = 'paper-tear';
  overlay.inert = true;
  overlay.setAttribute('aria-hidden', 'true');
  const ambient = stage.querySelector('.ambient').cloneNode(true);
  const transforms = Array.from(stage.querySelectorAll('.ambient .aurora'), light => getComputedStyle(light).transform);
  ambient.querySelectorAll('.aurora').forEach((light, index) => { light.style.transform = transforms[index]; });
  const snapshot = main.cloneNode(true);
  snapshot.removeAttribute('id');
  snapshot.querySelectorAll('[id], [data-view], [data-work-visual]').forEach(node => {
    node.removeAttribute('id');
    node.removeAttribute('data-view');
    node.removeAttribute('data-work-visual');
  });
  snapshot.querySelectorAll('iframe').forEach(frame => {
    frame.removeAttribute('src');
    frame.removeAttribute('srcdoc');
  });
  const scrollTop = main.scrollTop;
  const halves = [-1, 1].map(side => {
    const fragment = document.createElement('div');
    fragment.className = 'paper-sheet';
    const scroller = side < 0 ? snapshot : snapshot.cloneNode(true);
    fragment.append(ambient.cloneNode(true), scroller);
    fragment.insertAdjacentHTML('beforeend', '<svg class="paper-edge" viewBox="0 0 100 100" preserveAspectRatio="none"><path/><path/></svg>');
    overlay.append(fragment);
    return { side, fragment, scroller, edges: fragment.querySelectorAll('.paper-edge path') };
  });

  function draw(progress) {
    const rip = .12 * ease(progress / .22)
      + .43 * ease((progress - .12) / .30)
      + .45 * ease((progress - .43) / .25);
    const tip = -2 + 105 * rip;
    for (const { side, fragment, edges } of halves) {
      const left = side < 0;
      const border = left ? -2 : 102;
      const outline = [];
      const torn = [];
      for (const { x, y, position } of seam) {
        const open = ease((tip - position) / 37);
        const edge = (x + side * (open * (left ? 12 : 19) - .18)).toFixed(2);
        outline.push(`${edge}% ${y}%`);
        if (position < tip - 2) torn.push(`${edge} ${y}`);
      }
      fragment.style.clipPath = `polygon(${border}% -2%,${outline.join(',')},${border}% 102%)`;
      const line = torn.length ? `M${torn.join('L')}` : '';
      edges.forEach(edge => edge.setAttribute('d', line));

      const release = left ? clamp((progress - .71) / .29) : clamp((progress - .68) / .32);
      const x = side * 116 * release ** (left ? 1.35 : 1.65);
      const y = side * (left ? 27 : 42) * Math.sin(Math.PI * release / 2);
      const angle = side * (left ? 12 : 21) * ease(release);
      fragment.style.transform = `translate(${x}%,${y}%) rotate(${angle}deg)`;
    }
  }

  draw(0);
  stage.append(overlay);
  halves.forEach(({ scroller }) => { scroller.scrollTop = scrollTop; });
  const duration = 1580;
  const start = performance.now();
  let frame;
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const cancel = () => {
    cancelAnimationFrame(frame);
    overlay.remove();
    finish();
  };
  function tick(now) {
    const progress = clamp((now - start) / duration);
    if (progress === 1) {
      cancel();
      return;
    }
    draw(progress);
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return { finished, cancel };
}

export const paperTearTransition = {
  // shortcut: the paper copies are DOM clones, use a pixel snapshot to animate live media.
  supports: ({ main }) => CSS.supports('clip-path', 'polygon(0% 0%, 100% 0%, 100% 100%)')
    && canSnapshotMain(main),
  start({ stage, main }, commit) {
    const transition = playPaperTear(stage, main);
    commit();
    return transition;
  }
};
