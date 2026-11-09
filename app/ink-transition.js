import './ink.css';
import inkOpening from './ink-opening.png';
import inkPigment from './ink-pigment.png';

let ready = false;
const supportsMask = CSS.supports('mask-composite', 'subtract');
if (document.documentElement.startViewTransition && supportsMask) {
  Promise.all([inkOpening, inkPigment].map(src => {
    const texture = new Image();
    texture.src = src;
    return texture.decode();
  })).then(() => { ready = true; }, () => {});
}

export const inkTransition = {
  supports: ({ stage }) => ready && supportsMask && typeof stage.startViewTransition === 'function',
  start({ stage, main, link }, commit) {
    const rect = main.getBoundingClientRect();
    const anchor = link.getBoundingClientRect();
    const x = anchor.left + anchor.width / 2 - rect.left;
    const y = rect.height * .24;
    const radius = Math.hypot(Math.max(x, rect.width - x), rect.height - y);
    stage.style.setProperty('--ink-x', `${x}px`);
    stage.style.setProperty('--ink-y', `${y}px`);
    stage.style.setProperty('--ink-end', `${radius * 4.4}px`);
    stage.classList.add('ink-nav');

    let transition;
    let canceled = false;
    const cancel = () => {
      if (canceled) return;
      canceled = true;
      stage.classList.remove('ink-nav');
      transition?.skipTransition();
    };
    try {
      transition = stage.startViewTransition(commit);
    } catch (error) {
      cancel();
      throw error;
    }
    transition.ready.catch(() => {});
    return { finished: transition.finished, cancel };
  }
};
