import { inkTransition } from './ink-transition.js';
import { paperTearTransition } from './paper-tear.js';
import { paperShredTransition } from './paper-shred.js';

const transitions = [inkTransition, paperTearTransition, paperShredTransition];

export function prepareNavigationTransitions() {
  if (typeof window.requestIdleCallback === 'function') {
    const task = window.requestIdleCallback(paperShredTransition.prepare);
    return () => window.cancelIdleCallback(task);
  }
  const task = window.setTimeout(paperShredTransition.prepare, 500);
  return () => window.clearTimeout(task);
}

export function pickNavigationTransition(context) {
  const preferred = transitions[Math.floor(Math.random() * transitions.length)];
  if (preferred.supports(context)) return preferred;
  const available = transitions.filter(effect => effect !== preferred && effect.supports(context));
  return available[Math.floor(Math.random() * available.length)];
}
