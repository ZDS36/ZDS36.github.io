import { inkTransition } from './ink-transition.js';
import { paperTearTransition } from './paper-tear.js';

const transitions = [inkTransition, paperTearTransition];

export function pickNavigationTransition(context) {
  const available = transitions.filter(effect => effect.supports(context));
  return available[Math.floor(Math.random() * available.length)];
}
