import test from 'node:test'
import assert from 'node:assert/strict'
import { createTrafficSpace,trafficOverlaps,type TrafficPose } from '../scene/trafficSpace.ts'

const car=(x:number,z:number,heading=0):TrafficPose=>({x,z,heading,halfWidth:.103,halfLength:.2})
test('traffic footprints distinguish separated lanes, close following and crossing vehicles',()=>{
 assert.equal(trafficOverlaps(car(-.125,0),car(.125,0,Math.PI)),false)
 assert.equal(trafficOverlaps(car(0,0),car(0,.3)),true)
 assert.equal(trafficOverlaps(car(0,0),car(.25,0,Math.PI/2)),true)
 assert.equal(trafficOverlaps(car(0,0),car(0,.5)),false)
})
test('a following car yields, retains its position, then resumes after a bus clears',()=>{
 const space=createTrafficSpace(),bus={...car(0,.6),halfWidth:.112,halfLength:.37}
 assert.ok(space.move('bus',bus));assert.ok(space.move('car',car(0,0)))
 assert.equal(space.move('car',car(0,.1)),false)
 // Rejection must not move the stored car into the bus.
 assert.equal(space.move('bus',{...bus,z:.598}),true)
 assert.ok(space.move('bus',{...bus,z:1}));assert.ok(space.move('car',car(0,.1)))
})
test('crossing traffic cannot jump through another vehicle between frames',()=>{
 const space=createTrafficSpace()
 assert.ok(space.move('north',car(0,0)));assert.ok(space.move('east',car(-1,0,Math.PI/2)))
 assert.equal(space.move('east',car(1,0,Math.PI/2)),false)
 space.release('north');assert.ok(space.move('east',car(1,0,Math.PI/2)))
})
test('evicting one cell releases only that cell traffic',()=>{
 const space=createTrafficSpace(),a=space.scope(),b=space.scope()
 space.move(a+'car',car(0,0));space.move(b+'bike',car(2,0))
 space.release(a);assert.equal(space.size,1)
 assert.equal(space.move('other',car(2,0)),false)
 space.release(b);assert.equal(space.size,0)
})
