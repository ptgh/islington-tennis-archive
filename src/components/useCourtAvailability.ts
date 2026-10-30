import { useEffect, useState } from 'react'
import { supabase } from '../integrations/supabase/client'
import { feedIsFresh, nextFreeByVenue, LIVE_TIME_VENUES, type FeedState, type FreeSlot } from '../data/freeCourts'
export { LIVE_TIME_VENUES } from '../data/freeCourts'
type Snapshot = { key: string; slots: FreeSlot[]; feed: FeedState; complete: boolean; failed: boolean }
export function useCourtAvailability(enabled: boolean, start: number, end: number, now: number) {
  // Share a two-day read across planner choices. Minute-by-minute clock updates
  // filter locally; they do not repeatedly download the same slot feed.
  const queryStart = Math.floor(now / 600000) * 600000
  const queryEnd = Math.max(queryStart + 2 * 86400000, end)
  const key = `${queryStart}/${queryEnd}`
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  useEffect(() => {
    if (!enabled) return
    let alive = true, generation = 0
    const controller = new AbortController()
    const load = async () => {
      const request = ++generation
      try {
        const [slots, feed] = await Promise.all([
          supabase.from('court_slots').select('venue_id,start_at,court_name,remaining_uses', { count: 'exact' }).in('venue_id', LIVE_TIME_VENUES).gt('remaining_uses', 0)
            .gte('start_at', new Date(queryStart).toISOString()).lt('start_at', new Date(queryEnd).toISOString()).order('start_at').limit(1000).abortSignal(controller.signal),
          supabase.from('feed_state').select('last_success,caught_up').eq('id', 'better-slots').abortSignal(controller.signal).maybeSingle(),
        ])
        if (alive && request === generation) setSnapshot({ key, slots: slots.data ?? [], feed: feed.data, complete: slots.count === null ? (slots.data?.length ?? 0) < 1000 : slots.count <= (slots.data?.length ?? 0), failed: !!slots.error || !!feed.error })
      } catch { if (alive && request === generation) setSnapshot({ key, slots: [], feed: null, complete: false, failed: true }) }
    }
    if (!document.hidden) void load()
    const update = () => { if (!document.hidden) void load() }
    document.addEventListener('visibilitychange', update)
    return () => { alive = false; controller.abort(); document.removeEventListener('visibilitychange', update) }
  }, [enabled, queryStart, queryEnd, key])
  const current = snapshot?.key === key ? snapshot : null
  const fresh = !!current && !current.failed && feedIsFresh(current.feed, now)
  const slots = current?.slots.filter(slot => { const time = Date.parse(slot.start_at); return time >= start && time < end }) ?? []
  return { loading: !current, fresh, complete: current?.complete ?? false, checked: current?.feed?.last_success ?? null, next: fresh ? nextFreeByVenue(slots, now) : {} }
}
export type CourtAvailability = ReturnType<typeof useCourtAvailability>
