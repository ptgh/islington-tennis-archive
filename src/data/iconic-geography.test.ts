import test from 'node:test'
import assert from 'node:assert/strict'
import { footprint, inside, mappedCourtPosition, venueGeography } from '../scene/mappedVenue.ts'

// A court rotated in world space must keep its real dimensions and orientation.
test('mapped court rectangles preserve metres, rotation and centre', () => {
  for (const angle of [0, .37, 1.4, 2.8]) {
    const local = [[-5.485,-11.885],[5.485,-11.885],[5.485,11.885],[-5.485,11.885],[-5.485,-11.885]]
    const points = local.map(([x,z])=>[27+x*Math.cos(angle)+z*Math.sin(angle),-46-x*Math.sin(angle)+z*Math.cos(angle)])
    const box = footprint(points)
    assert.ok(Math.abs(box.width-10.97)<1e-6)
    assert.ok(Math.abs(box.depth-23.77)<1e-6)
    assert.ok(Math.abs(box.x-27)<1e-6 && Math.abs(box.z+46)<1e-6)
    assert.ok(Math.abs(Math.sin(box.angle-angle))<1e-6)
    assert.ok(inside([box.x,box.z],points))
    assert.equal(inside([box.x+40,box.z],points),false)
  }
})

test('every menu destination resolves to a mapped full-sized tennis court within its venue', () => {
  const stops = { wimbledon:['centre','number-one','number-two','number-three','outer'], queens:['arena','court-one','outer','practice'] } as const
  for (const id of ['wimbledon','queens'] as const) {
    const data = venueGeography[id]
    const boundary = data.features.find(f=>f.id===(id==='wimbledon'?-4268203:55149713))!
    assert.ok(boundary,`${id}: missing grounds boundary`)
    const positions = stops[id].map(stop=>mappedCourtPosition(id,stop))
    for (const p of positions) {
      assert.ok('width' in p,`${id}: destination fell back to the map origin`)
      if (!('width' in p)) continue
      assert.ok(Math.abs(p.width-10.97)<1 && Math.abs(p.depth-23.77)<1)
      assert.ok(inside([p.x,p.z],boundary.points),`${id}: court outside grounds`)
    }
    assert.equal(new Set(positions.map(p=>`${p.x},${p.z}`)).size,stops[id].length)
  }
  // North maps to negative z; the two main Wimbledon show courts must not swap places.
  assert.ok(mappedCourtPosition('wimbledon','number-one').z < mappedCourtPosition('wimbledon','centre').z)
})

test('bundled geography contains finite map coordinates, unique features and attribution', () => {
  for (const data of Object.values(venueGeography)) {
    assert.equal(new Set(data.features.map(f=>f.id)).size,data.features.length)
    assert.equal(data.license,'https://www.openstreetmap.org/copyright')
    assert.ok(data.features.filter(f=>'building' in f.tags).length>100)
    assert.ok(data.features.filter(f=>'highway' in f.tags).length>100)
    for (const f of data.features) {
      assert.ok(f.points.length>=2)
      assert.ok(f.points.every(p=>p.length===2 && p.every(Number.isFinite)))
      assert.ok(!Object.keys(f.tags).some(k=>k.startsWith('addr:')||['user','uid','changeset'].includes(k)))
    }
  }
})
