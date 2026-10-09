import test from 'node:test'
import assert from 'node:assert/strict'
import { clockLabel, londonMinutes, londonPreviewTime } from './lightingTime.ts'

test('London preview uses GMT in winter and BST in summer independently of device zone', () => {
  assert.equal(new Date(londonPreviewTime(new Date('2026-01-12T17:00:00Z'), 720)).toISOString(), '2026-01-12T12:00:00.000Z')
  assert.equal(new Date(londonPreviewTime(new Date('2026-07-12T17:00:00Z'), 720)).toISOString(), '2026-07-12T11:00:00.000Z')
  assert.equal(londonMinutes(new Date('2026-07-12T11:15:00Z')), 735)
  assert.equal(clockLabel(735), '12:15')
})

test('preview uses the London calendar date even when UTC is on the previous day', () => {
  assert.equal(new Date(londonPreviewTime(new Date('2026-07-12T23:30:00Z'), 480)).toISOString(), '2026-07-13T07:00:00.000Z')
})

test('missing spring hour advances and repeated autumn hour chooses its first occurrence', () => {
  assert.equal(new Date(londonPreviewTime(new Date('2026-03-29T12:00:00Z'), 90)).toISOString(), '2026-03-29T01:30:00.000Z')
  assert.equal(londonMinutes(new Date(londonPreviewTime(new Date('2026-03-29T12:00:00Z'), 90))), 150)
  assert.equal(new Date(londonPreviewTime(new Date('2026-10-25T12:00:00Z'), 90)).toISOString(), '2026-10-25T00:30:00.000Z')
})
