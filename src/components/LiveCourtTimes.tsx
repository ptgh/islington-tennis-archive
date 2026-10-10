import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { feedIsFresh, nextFreeByVenue, type NextFree } from '../data/freeCourts';

/** Venues whose individual courts appear in Better's open slot feed. */
export const LIVE_TIME_VENUES = ['highbury-fields', 'islington-tennis-centre'];

type Slot = { start_at: string; court_name: string; remaining_uses: number };
const day = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/London' });
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

/** Next free start per live venue for the map pins; empty unless Better's feed is fresh.
 * Refreshes every ten minutes while the page is open, matching the 15-minute sync. */
export function useNextFreeCourts(enabled: boolean) {
  const [next, setNext] = useState<Record<string, NextFree>>({});
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const load = () => {
      const now = new Date(), until = new Date(now.getTime() + 86400_000);
      Promise.all([
        supabase.from('court_slots').select('venue_id,start_at,court_name,remaining_uses').in('venue_id', LIVE_TIME_VENUES).gt('remaining_uses', 0)
          .gte('start_at', now.toISOString()).lt('start_at', until.toISOString()).order('start_at').limit(400),
        supabase.from('feed_state').select('last_success,caught_up').eq('id', 'better-slots').maybeSingle(),
      ]).then(([slots, feed]) => {
        if (live) setNext(!slots.error && feedIsFresh(feed.data) ? nextFreeByVenue(slots.data ?? []) : {});
      });
    };
    load();
    const timer = setInterval(load, 10 * 60_000);
    return () => { live = false; clearInterval(timer); };
  }, [enabled]);
  return next;
}

export function LiveCourtTimes({ venueId }: { venueId: string }) {
  const [state, setState] = useState<{ slots: Slot[]; checked: string | null; ok: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    const until = new Date(Date.now() + 2 * 86400_000);
    Promise.all([
      supabase.from('court_slots').select('start_at,court_name,remaining_uses').eq('venue_id', venueId).gt('remaining_uses', 0)
        .gte('start_at', new Date().toISOString()).lt('start_at', until.toISOString()).order('start_at').limit(600),
      supabase.from('feed_state').select('last_success,caught_up').eq('id', 'better-slots').maybeSingle(),
    ]).then(([slots, feed]) => {
      if (!live) return;
      setState({ slots: slots.data ?? [], checked: feed.data?.last_success ?? null, ok: !slots.error && feedIsFresh(feed.data) });
    });
    return () => { live = false; };
  }, [venueId]);

  if (!LIVE_TIME_VENUES.includes(venueId)) return null;
  const groups = new Map<string, Map<string, number>>();
  for (const s of state?.slots ?? []) {
    const d = day(new Date(s.start_at));
    if (!groups.has(d)) groups.set(d, new Map());
    const g = groups.get(d)!;
    g.set(time(s.start_at), (g.get(time(s.start_at)) ?? 0) + 1);
  }
  return <section className="court-approach live-times" aria-label="Free court times">
    <span className="court-approach__eyebrow">FREE TIMES · NEXT 2 DAYS</span>
    {!state && <p>Checking Better’s court times…</p>}
    {state && !state.ok && <p>Live court times aren’t available right now. Check Better’s booking page for current times.</p>}
    {state?.ok && !groups.size && <p>Better’s feed lists no free times in the next two days. It may still have cancellations, so check the booking page.</p>}
    {state?.ok && [...groups].map(([d, times]) => <div key={d} className="live-times__day">
      <strong>{d}</strong>
      <div className="live-times__list">{[...times].map(([t, n]) => <span key={t}>{t}<small>{n} {n === 1 ? 'court' : 'courts'}</small></span>)}</div>
    </div>)}
    {state?.checked && <small>Listed as available in Better’s open data (CC-BY 4.0) · updated {time(state.checked)}. Times can go quickly, so confirm when you book.</small>}
  </section>;
}
