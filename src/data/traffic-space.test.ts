import test from 'node:test'
import assert from 'node:assert/strict'
import { createTrafficSpace,trafficOverlaps,moveRoadTraffic,type TrafficPose } from '../scene/trafficSpace.ts'

const car=(x:number,z:number,heading=0):TrafficPose=>({x,z,heading,halfWidth:.103,halfLength:.2})
test('traffic footprints distinguish separated lanes, close following and crossing vehicles',()=>{
 assert.equal(trafficOverlaps(car(-.125,0),car(.125,0,Math.PI)),false)
 assert.equal(trafficOverlaps(car(0,0),car(0,.3)),true)
 assert.equal(trafficOverlaps(car(0,0),car(.25,0,Math.PI/2)),true)
 assert.equal(trafficOverlaps(car(0,0),car(0,.65)),false)
})
test('a following car yields, retains its position, then resumes after a bus clears',()=>{
 const space=createTrafficSpace(),bus={...car(0,.8),halfWidth:.112,halfLength:.37}
 assert.ok(space.move('bus',bus));assert.ok(space.move('car',car(0,0)))
 assert.equal(space.move('car',car(0,.1)),false)
 // Rejection must not move the stored car into the bus.
 assert.equal(space.move('bus',{...bus,z:.798}),true)
 assert.ok(space.move('bus',{...bus,z:1}));assert.ok(space.move('car',car(0,.1)))
})
test('a full-width van and bus pass in opposite UK lanes with a longer following gap',()=>{
 const bus={...car(-.125,0,Math.PI),halfWidth:.112,halfLength:.37},van={...car(.125,0),halfWidth:.114,halfLength:.23}
 assert.equal(trafficOverlaps(bus,van),false)
 assert.equal(trafficOverlaps({...bus,x:.125,heading:0,z:.62},van),true,'following gap was not preserved')
 for(const angle of [0,.4,1.6,-2.4]){
  const rotate=(p:TrafficPose)=>({...p,x:p.x*Math.cos(angle)+p.z*Math.sin(angle),z:-p.x*Math.sin(angle)+p.z*Math.cos(angle),heading:p.heading+angle})
  assert.equal(trafficOverlaps(rotate(bus),rotate(van)),false,'clear lanes depend on map heading')
 }
})
test('a bus does not steer into an oncoming vehicle as if it were overtaking',()=>{
 const space=createTrafficSpace(),bus={...car(.125,0),halfWidth:.112,halfLength:.37},oncoming=car(.125,.8,Math.PI)
 assert.ok(space.move('bus',bus));assert.ok(space.move('oncoming',oncoming))
 assert.equal(moveRoadTraffic(space,'bus',bus,{...bus,z:.1},0,.05),null)
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
test('a bus passes a stopped car without overlap, stays inside both lanes and returns left',()=>{
 const space=createTrafficSpace(),stopped=car(.125,1)
 space.move('car',stopped)
 let pose={...car(.125,0),halfWidth:.112,halfLength:.37},offset=0,progress=0,passed=false
 space.move('bus',pose)
 for(let frame=0;frame<1000;frame++){
  const next={...pose,x:.125,z:progress+.025},move=moveRoadTraffic(space,'bus',pose,next,offset,.05)
  if(move){pose=move.pose;offset=move.offset;if(move.advanced)progress+=.025}
  assert.equal(trafficOverlaps(pose,stopped),false)
  assert.ok(Math.abs(pose.x)+pose.halfWidth<=.25,'bus crossed the carriageway edge')
  passed||=offset<-.20
  if(progress>2)break
 }
 assert.ok(progress>2,'tour deadlocked behind a stopped vehicle');assert.ok(passed);assert.equal(offset,0)
})

test('neighbouring streamed cells cannot spawn duplicate traffic on the same source run',()=>{
 const space=createTrafficSpace();assert.equal(space.claim('source-road','cell-a:car'),true);assert.equal(space.claim('source-road','cell-a:car'),true);assert.equal(space.claim('source-road','cell-b:cycle'),false);
 space.release('cell-b:');assert.equal(space.claim('source-road','cell-b:cycle'),false);
 space.release('cell-a:');assert.equal(space.claim('source-road','cell-b:cycle'),true);
});
