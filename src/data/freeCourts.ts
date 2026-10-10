export type FreeSlot = { venue_id: string; start_at: string; court_name: string; remaining_uses: number };
export type FeedState = { last_success: string | null; caught_up: boolean | null } | null;
export type NextFree = { start: number; courts: number };

/** Better's feed is trusted only when caught up and synced within the last 90 minutes. */
export const FEED_STALE_MS = 90 * 60_000;
export function feedIsFresh(feed: FeedState, now = Date.now()) {
  const checked = feed?.last_success ? Date.parse(feed.last_success) : NaN;
  return !!feed?.caught_up && Number.isFinite(checked) && now - checked < FEED_STALE_MS;
}

/** Earliest upcoming free start per venue, with how many distinct courts are free then. */
export function nextFreeByVenue(slots: FreeSlot[], now = Date.now()): Record<string, NextFree> {
  const next: Record<string, { start: number; courts: Set<string> }> = {};
  for (const slot of slots) {
    const start = Date.parse(slot.start_at);
    if (!(slot.remaining_uses > 0) || !Number.isFinite(start) || start < now) continue;
    const current = next[slot.venue_id];
    if (!current || start < current.start) next[slot.venue_id] = { start, courts: new Set([slot.court_name]) };
    else if (start === current.start) current.courts.add(slot.court_name);
  }
  return Object.fromEntries(Object.entries(next).map(([id, value]) => [id, { start: value.start, courts: value.courts.size }]));
}

const londonDay = (time: number) => new Date(time).toLocaleDateString('en-GB', { timeZone: 'Europe/London' });
/** "16:00" today, otherwise "Sun 09:00", in London time. */
export function freeLabel(start: number, now = Date.now()) {
  const clock = new Date(start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  if (londonDay(start) === londonDay(now)) return clock;
  return `${new Date(start).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Europe/London' })} ${clock}`;
}
