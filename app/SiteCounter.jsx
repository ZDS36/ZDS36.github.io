import React, { useSyncExternalStore } from 'react';

const endpoint = import.meta.env.VITE_SITE_STATS_ENDPOINT?.trim();
const formatNumber = new Intl.NumberFormat('zh-CN');
const listeners = new Set();
let total = null;

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getTotal() { return total; }

async function record(event) {
  if (!endpoint) return;
  try {
    const url = new URL(endpoint);
    url.searchParams.set('event', event);
    const response = await fetch(url, { method: 'POST', keepalive: true, credentials: 'omit' });
    if (!response.ok) return;
    const result = await response.json();
    // Rapid clicks can finish out of order. Keep the newest cumulative value.
    if (!Number.isSafeInteger(result?.total) || result.total < 0 || (total !== null && result.total <= total)) return;
    total = result.total;
    listeners.forEach(listener => listener());
  } catch {
    // Counting must stay independent of navigation and rendering.
  }
}

export function startSiteCounter(root) {
  if (!endpoint) return;
  const countVisibleView = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', countVisibleView);
    void record('view');
  };
  const afterEntrance = () => {
    document.addEventListener('visibilitychange', countVisibleView);
    countVisibleView();
  };
  if (root.hasAttribute('data-entrance')) root.addEventListener('entrance:entered', afterEntrance, { once: true });
  else afterEntrance();
}

export function countHomeClick(event) {
  if (event.button !== (event.type === 'auxclick' ? 1 : 0)) return;
  if (event.target.closest('a[data-home-click]')) void record('click');
}

export default function SiteCounter() {
  const count = useSyncExternalStore(subscribe, getTotal);
  return (
    <dl className="home__counter">
      <dt>网站点击</dt>
      <dd>{count === null ? '—' : formatNumber.format(count)}</dd>
    </dl>
  );
}
