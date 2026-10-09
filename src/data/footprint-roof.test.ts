import test from 'node:test'
import assert from 'node:assert/strict'
import { createFootprintRoof } from '../scene/footprintRoof.ts'

test('long mapped terraces retain their footprint and gain a raised continuous ridge', () => {
  const roof = createFootprintRoof([[-6,-60],[6,-60],[6,60],[-6,60],[-6,-60]], {x:0,z:0,width:12,angle:0}, 8, 3)
  const p = roof.getAttribute('position'), n = roof.getAttribute('normal')
  const heights = []
  for (let i=0;i<p.count;i++) {
    assert.ok(Math.abs(p.getX(i))<=6 && Math.abs(p.getZ(i))<=60)
    assert.ok(n.getY(i)>0)
    heights.push(p.getY(i))
  }
  assert.equal(Math.max(...heights),11)
  assert.equal(Math.min(...heights),8)
  roof.dispose()
})