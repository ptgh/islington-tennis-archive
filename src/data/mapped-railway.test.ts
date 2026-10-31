import test from 'node:test'
import assert from 'node:assert/strict'
import {mappedRailwayParts} from '../scene/mappedRailway.ts'
import {inside,venueGeography} from '../scene/mappedVenue.ts'

test('railway detail follows stored centrelines, preserves gauge and leaves club courts clear',()=>{
 for(const data of Object.values(venueGeography)){
  const before=structuredClone(data.railways),parts=mappedRailwayParts(data.railways)
  assert.ok(parts.ballast.length>0)
  assert.equal(parts.rails.length,parts.ballast.length*2)
  const source=data.railways.flatMap(way=>way.points.slice(1).map((b,i)=>({a:way.points[i],b}))).filter(({a,b})=>Math.hypot(b[0]-a[0],b[1]-a[1])>=.001)
  assert.equal(parts.ballast.length,source.length)
  for(const [i,part] of parts.ballast.entries()){
   const {a,b}=source[i]
   assert.equal(part.x,(a[0]+b[0])/2);assert.equal(part.z,(a[1]+b[1])/2)
   const [left,right]=parts.rails.slice(i*2,i*2+2)
   assert.ok(Math.abs(Math.hypot(left.x-right.x,left.z-right.z)-1.435)<1e-9)
   for(let n=0;n<=10;n++)for(const side of [-1,0,1]){
    const x=a[0]+(b[0]-a[0])*n/10+Math.sin(part.angle)*1.7*side,z=a[1]+(b[1]-a[1])*n/10+Math.cos(part.angle)*1.7*side
    for(const feature of data.features.filter(f=>f.tags.leisure==='pitch'||f.tags.leisure==='stadium'))assert.equal(inside([x,z],feature.points),false)
   }
  }
  assert.deepEqual(data.railways,before)
 }
})

test('sleeper spacing continues around bends and skips repeated points',()=>{
 const parts=mappedRailwayParts([{points:[[0,0],[0,0],[1,0],[1,1]]}])
 assert.equal(parts.ballast.length,2)
 assert.equal(parts.sleepers.length,3)
 for(const [i,expected] of [[.34,0],[1,.02],[1,.70]].entries()){
  assert.ok(Math.abs(parts.sleepers[i].x-expected[0])<1e-9)
  assert.ok(Math.abs(parts.sleepers[i].z-expected[1])<1e-9)
 }
 assert.deepEqual(mappedRailwayParts([{points:[[1,1],[1,1]]}]),{ballast:[],rails:[],sleepers:[]})
})
