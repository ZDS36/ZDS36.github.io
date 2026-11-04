export const IP_DAILY_LIMIT = 3;
export const SITE_DAILY_LIMIT = 20;
export const COOLDOWN_MS = 60_000;
const DAY_MS = 86_400_000;
const SHANGHAI_OFFSET = 8 * 3_600_000;

export function reserveQuota(previous, key, now) {
  const day = Math.floor((now + SHANGHAI_OFFSET) / DAY_MS);
  const untilReset = Math.ceil(((day + 1) * DAY_MS - SHANGHAI_OFFSET - now) / 1000);
  const state = previous?.day === day ? previous : { day, total: 0, clients: {} };
  const client = state.clients[key];
  if (client?.count >= IP_DAILY_LIMIT) return { code: 'daily_limit', retryAfter: untilReset };
  if (client && now - client.last < COOLDOWN_MS) {
    return { code: 'cooldown', retryAfter: Math.ceil((COOLDOWN_MS - now + client.last) / 1000) };
  }
  if (state.total >= SITE_DAILY_LIMIT) return { code: 'site_limit', retryAfter: untilReset };
  return {
    next: {
      day, total: state.total + 1,
      clients: { ...state.clients, [key]: { count: (client?.count || 0) + 1, last: now } }
    }
  };
}
