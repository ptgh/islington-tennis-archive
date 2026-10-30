import { londonMinutes, londonPreviewTime } from './lightingTime.ts'
export type PlayPeriod = 'next24' | 'tonight' | 'tomorrow'
export type PlannerPreferences = { period: PlayPeriod; after: string; listedOnly: boolean }
export const DEFAULT_PLANNER: PlannerPreferences = { period: 'next24', after: '', listedOnly: false }
export function parsePlannerPreferences(raw: string | null): PlannerPreferences {
  try {
    const value = JSON.parse(raw ?? '{}')
    return { period: ['next24', 'tonight', 'tomorrow'].includes(value?.period) ? value.period : 'next24', after: typeof value?.after === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.after) ? value.after : '', listedOnly: value?.listedOnly === true }
  } catch { return { ...DEFAULT_PLANNER } }
}
/** London civil days, including the 23/25-hour DST days. Rolling windows share
 * a minute-resolution query bucket; displayed results still reject already-past slots. */
export function playWindow(preferences: PlannerPreferences, now = Date.now()) {
  const date = new Date(now), midnight = londonPreviewTime(date, 0)
  const noon = new Date(londonPreviewTime(date, 720))
  const nextDay = new Date(noon); nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const tomorrow = londonPreviewTime(nextDay, 0)
  const followingDay = new Date(nextDay); followingDay.setUTCDate(followingDay.getUTCDate() + 1)
  let start = Math.floor(now / 60000) * 60000, end = start + 86400000
  if (preferences.period === 'tonight') { start = Math.max(start, londonPreviewTime(date, 1080)); end = tomorrow }
  if (preferences.period === 'tomorrow') { start = tomorrow; end = londonPreviewTime(followingDay, 0) }
  if (preferences.after) {
    const [hour, minute] = preferences.after.split(':').map(Number), after = hour * 60 + minute
    // For the rolling window a clock time already passed means its next occurrence.
    const day = preferences.period === 'tomorrow' || preferences.period === 'next24' && after < londonMinutes(date) ? nextDay : date
    start = Math.max(start, londonPreviewTime(day, after))
  }
  return { start: Math.max(midnight, start), end }
}
