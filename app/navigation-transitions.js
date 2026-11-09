import { inkTransition } from './ink-transition.js';
import { paperTearTransition } from './paper-tear.js';
import { paperShredTransition } from './paper-shred.js';

const transitions = [inkTransition, paperTearTransition, paperShredTransition];

export function pickNavigationTransition(context) {
  const available = transitions.filter(effect => effect.supports(context));
  return available[Math.floor(Math.random() * available.length)];
}
