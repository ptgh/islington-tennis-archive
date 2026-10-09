const clock = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
function parts(date: Date) {
  const values = Object.fromEntries(clock.formatToParts(date).map(p => [p.type, Number(p.value)]))
  return { year: values.year, month: values.month, day: values.day, minutes: values.hour * 60 + values.minute }
}
export const londonMinutes = (date: Date) => parts(date).minutes
export const clockLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** Preview today's London civil time. At the autumn repeat choose the earlier
 * occurrence; the missing spring hour advances to the next valid hour. */
export function londonPreviewTime(date: Date, minutes: number) {
  const day = parts(date)
  const wanted = Math.min(1439, Math.max(0, Math.round(minutes)))
  const utc = Date.UTC(day.year, day.month - 1, day.day, 0, wanted)
  for (const offset of [60, 0]) {
    const candidate = utc - offset * 60000, local = parts(new Date(candidate))
    if (local.year === day.year && local.month === day.month && local.day === day.day && local.minutes === wanted) return candidate
  }
  return utc
}
