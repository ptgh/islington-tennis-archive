import test from 'node:test'
import assert from 'node:assert/strict'
import { hasMappedCoverage } from './mapCoverage.ts'
import geography from './highbury-geography.json' with { type: 'json' }

test('mapped coverage includes every recorded court without implying borough-wide coverage', () => {
  for (const court of geography.courts) for (const [lng, lat] of court.points) assert.equal(hasMappedCoverage(lat, lng), true)
  assert.equal(hasMappedCoverage(51.549, -.099), true)
  assert.equal(hasMappedCoverage(51.5512, -.1269), false, 'a location outside both extracts uses illustrated context')
  assert.equal(hasMappedCoverage(51.5456, -.1033), false, 'Highbury Corner camera is outside this extract')
  assert.equal(hasMappedCoverage(NaN, -.1), false)
})
test('extract edges remain inclusive and locations beyond them choose illustrated context', () => {
  const [west, south, east, north] = geography.bbox
  assert.equal(hasMappedCoverage(south, west), true)
  assert.equal(hasMappedCoverage(north, east), true)
  assert.equal(hasMappedCoverage(north + .000001, east), false)
  assert.equal(hasMappedCoverage(south, west - .000001), false)
})
