import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import roadRoutes from './borough-transport.json' with {type:'json'}
import { boroughGeography,type BoroughCell } from '../scene/boroughGeometry.ts'
import { boroughRoadProfile } from '../scene/boroughStreetEdges.ts'
import { createGear } from '../scene/createGear.ts'
import { createIslington } from '../scene/createIslington.ts'
import { venues } from './venues.ts'

const key=(a:number[],b:number[])=>[a.join(','),b.join(',')].sort().join('|')
test('transport links are actual connected carriageway segments, never stop-to-stop chords or footways',()=>{
 const roads=new Set<string>()
 for(const cell of boroughGeography.cells){const data=JSON.parse(fs.readFileSync('public/'+cell.url,'utf8')) as BoroughCell
  for(const road of data.roads){const profile=boroughRoadProfile(road.kind);if(profile.walking||profile.width<.5)continue
   road.points.slice(1).forEach((p,i)=>roads.add(key(road.points[i],p)))
  }
 }
 for(const [id,points] of Object.entries(roadRoutes))for(let i=1;i<points.length;i++)assert.ok(roads.has(key(points[i-1],points[i])),`route ${id} leaves a mapped carriageway`)
 assert.equal(roadRoutes['139'].length,0,'unsupported geography does not acquire an invented road')
})
test('the Stringer van remains centred on its source carriageway through both travel directions',()=>{
 const gear=createGear(()=>new THREE.Vector3(),[],true);gear.root.scale.setScalar(.1);gear.van.scale.setScalar(1)
 const points=roadRoutes['19'],position=new THREE.Vector3()
 try{
  for(let step=0;step<4000;step++){
   gear.animate(1,true);gear.root.updateMatrixWorld(true);gear.van.getWorldPosition(position)
   const distance=Math.min(...points.slice(1).map((b,i)=>{const a=points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((position.x-a[0])*dx+(position.z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(position.x-a[0]-dx*t,position.z-a[1]-dz*t)}))
   assert.ok(distance<1e-8,'van centre crossed a kerb')
  }
 }finally{
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>()
  gear.root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}})
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())
 }
})
test('bus tours pause, complete at a real court, stop there, and replay from the start',()=>{
 const world=createIslington(venues),point=new THREE.Vector3(),arrived=new THREE.Vector3()
 try{
  assert.equal(world.startBusRide('139'),false)
  for(const id of ['19','30','43','393']){
   assert.equal(world.startBusRide(id),true)
   const wheelAngles=()=>{
    const position=new THREE.Vector3();world.busPosition(id,position)
    const angles:number[]=[]
    world.root.traverse(o=>{if(o.name==='Miniature bus'&&o.getWorldPosition(new THREE.Vector3()).distanceTo(position)<1e-8)for(const child of o.children)if(child instanceof THREE.Mesh&&child.geometry instanceof THREE.CylinderGeometry&&child.geometry.parameters.radiusTop===.28)angles.push(child.rotation.x)})
    return angles
   }
   const startingWheels=wheelAngles();assert.equal(startingWheels.length,4)
   assert.equal(world.busRideStatus()?.progress,0)
   world.animate(0,false,false,false);assert.equal(world.busRideStatus()?.progress,0)
   // The world consumes a bounded frame delta, not wall-clock jumps.
   for(let frame=1;frame<=920;frame++)world.animate(frame*.05,true,true,true)
   assert.equal(world.busRideStatus()?.progress,1)
   const arrivedWheels=wheelAngles();assert.notDeepEqual(arrivedWheels,startingWheels,'moving bus wheels did not turn')
   const target=world.anchors.get(world.busRideStatus()!.destinationId)!
   world.busPosition(id,arrived)
   assert.ok(arrived.distanceTo(target)<100,'tour has no nearby court')
   assert.ok(Math.abs(arrived.distanceTo(target)*10-world.busRideStatus()!.walkMetres)<6,'remaining distance must describe the actual road-to-court gap')
   assert.equal(venues.find(v=>v.id===world.busRideStatus()!.destinationId)?.access,'public','default tours should finish at public tennis venues')
   world.animate(47,true,true,true);world.busPosition(id,point);assert.ok(point.distanceTo(arrived)<1e-8,'arrived bus drove away')
   assert.deepEqual(wheelAngles(),arrivedWheels,'arrived bus wheels kept turning')
   assert.equal(world.startBusRide(id),true);assert.equal(world.busRideStatus()?.progress,0)
   // Reset monotonic scene time between independent tours.
   world.animate(0,false,false,false)
  }
 }finally{world.dispose()}
})
test('the Highbury tour completes with sourced neighbourhood traffic loaded',async()=>{
 const originalFetch=globalThis.fetch
 globalThis.fetch=async(input)=>new Response(fs.readFileSync('public'+String(input),'utf8'))
 const world=createIslington(venues)
 try{
  await world.ready
  while(world.status.loading)await new Promise(resolve=>setImmediate(resolve))
  assert.ok(world.status.loaded>0);assert.equal(world.status.failed,0)
  world.setBusRoute('19');assert.equal(world.startBusRide('19'),true)
  for(let frame=1;frame<=2400&&world.busRideStatus()!.progress<1;frame++)world.animate(frame*.05,true,true,true)
  assert.equal(world.busRideStatus()?.progress,1,'tour stuck behind neighbourhood traffic')
 }finally{world.dispose();globalThis.fetch=originalFetch}
})
