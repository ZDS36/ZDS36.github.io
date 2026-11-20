import { inkTransition } from './ink-transition.js';
import { paperTearTransition } from './paper-tear.js';
import { paperShredTransition } from './paper-shred.js';

const transitions = [inkTransition, paperTearTransition, paperShredTransition];

export function pickNavigationTransition(context) {
  const preferred = transitions[Math.floor(Math.random() * transitions.length)];
  if (preferred.supports(context)) return preferred;
  const available = transitions.filter(effect => effect !== preferred && effect.supports(context));
  return available[Math.floor(Math.random() * available.length)];
}
