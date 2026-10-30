import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePlannerPreferences, playWindow } from './courtPlanner.ts'

test('planner storage rejects invalid preferences without changing valid saved choices', () => {
  assert.deepEqual(parsePlannerPreferences('broken'), { period: 'next24', after: '', listedOnly: false })
  assert.deepEqual(parsePlannerPreferences('{"period":"yesterday","after":"25:61","listedOnly":"true"}'), { period: 'next24', after: '', listedOnly: false })
  assert.deepEqual(parsePlannerPreferences('{"period":"tomorrow","after":"18:30","listedOnly":true}'), { period: 'tomorrow', after: '18:30', listedOnly: true })
})
test('tomorrow respects London 23-hour and 25-hour days', () => {
  const spring = playWindow({ period: 'tomorrow', after: '', listedOnly: false }, Date.parse('2026-03-28T12:00:00Z'))
  assert.equal(new Date(spring.start).toISOString(), '2026-03-29T00:00:00.000Z')
  assert.equal(spring.end - spring.start, 23 * 3600000)
  const autumn = playWindow({ period: 'tomorrow', after: '', listedOnly: false }, Date.parse('2026-10-24T12:00:00Z'))
  assert.equal(new Date(autumn.start).toISOString(), '2026-10-24T23:00:00.000Z')
  assert.equal(autumn.end - autumn.start, 25 * 3600000)
})
test('evening starts at 18:00 London and elapsed start times move forward only inside the rolling window', () => {
  const now = Date.parse('2026-07-01T14:05:00Z')
  const evening = playWindow({ period: 'tonight', after: '', listedOnly: false }, now)
  assert.equal(new Date(evening.start).toISOString(), '2026-07-01T17:00:00.000Z')
  assert.equal(new Date(evening.end).toISOString(), '2026-07-01T23:00:00.000Z')
  const nextStart = playWindow({ period: 'next24', after: '15:00', listedOnly: false }, now)
  assert.equal(new Date(nextStart.start).toISOString(), '2026-07-02T14:00:00.000Z')
  assert.ok(nextStart.start < nextStart.end)
  const tonight = playWindow({ period: 'tonight', after: '19:30', listedOnly: false }, now)
  assert.equal(new Date(tonight.start).toISOString(), '2026-07-01T18:30:00.000Z')
})
