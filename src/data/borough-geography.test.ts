import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { boroughGeography, boroughBounds, boroughCourts, containsPoint, courtsNearVenue, boroughCourtDimensions, buildingHeight, detailCellLimit, detailCellsInView, footprintArea, type BoroughCell } from '../scene/boroughGeometry.ts'
import { avenueTreeSites } from '../scene/boroughFurniture.ts'
import { BOROUGH_NEIGHBOURS, boundaryStrength, washGeometry, washStrength } from '../scene/createBoroughBoundary.ts'
import { otherCourtPins } from '../scene/boroughGeometry.ts'
import { projectPoint } from '../scene/courtGeometry.ts'
import { createBoroughMaterials, createBoroughTile } from '../scene/createBoroughTile.ts'
import { createIslington } from '../scene/createIslington.ts'
import { venues } from './venues.ts'
import { places } from './places.ts'

const dir=path.resolve('public')
test('Tufnell run-off polygons retain their footprint around regulation-sized playing rectangles',()=>{
 const venue=venues.find(v=>v.id==='tufnell-park')!,courts=courtsNearVenue(venue.lat,venue.lng)
 assert.equal(courts.length,2)
 for(const court of courts){const dimensions=boroughCourtDimensions(court)
  assert.equal(dimensions.w,10.97);assert.equal(dimensions.d,23.77)
  assert.equal(dimensions.ow,court.width*10);assert.equal(dimensions.od,court.depth*10)
  assert.ok(dimensions.ow>dimensions.w&&dimensions.od>dimensions.d)
 }
 const ordinary=boroughCourtDimensions({width:1.097,depth:2.377})
 assert.ok(Math.abs(ordinary.w-10.97)<1e-9&&Math.abs(ordinary.d-23.77)<1e-9)
 assert.ok(ordinary.ow>ordinary.w&&ordinary.od>ordinary.d)
})
test('close-up landmark anchors fall inside their stored source building footprint bounds',()=>{
 for(const [id,way] of [['union-chapel',27815160],['clock-tower',37371124],['estorick',230253685]] as const){
  const place=places.find(p=>p.id===id)!,[x,z]=projectPoint(place.lng,place.lat)
  const buildings=boroughGeography.cells.flatMap(cell=>(JSON.parse(fs.readFileSync(path.join(dir,cell.url),'utf8')) as BoroughCell).buildings)
  const points=buildings.find(b=>b.id===way)!.points
  assert.ok(x>=Math.min(...points.map(p=>p[0]))&&x<=Math.max(...points.map(p=>p[0])),id)
  assert.ok(z>=Math.min(...points.map(p=>p[1]))&&z<=Math.max(...points.map(p=>p[1])),id)
 }
})
test('borough window clones retain pane detail and light selected rooms without recolouring every window',()=>{
 const materials=createBoroughMaterials()
 try{
  assert.equal(materials.glass.onBeforeCompile,materials.finishes.glazing.onBeforeCompile)
  const color=materials.glass.color.getHex(),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}}
  materials.glass.onBeforeCompile(shader as Parameters<typeof materials.glass.onBeforeCompile>[0],{} as THREE.WebGLRenderer)
  assert.match(shader.fragmentShader,/totalEmissiveRadiance \*= mix\(.055, 1.0, occupied\)/,'room occupancy modulates the evening light')
  materials.setNight(true)
  assert.equal(materials.glass.emissiveIntensity,.65)
  assert.equal(materials.glass.color.getHex(),color,'unlit panes retain their daytime glass finish')
  materials.setNight(false)
  assert.equal(materials.glass.emissiveIntensity,0)
 }finally{materials.dispose()}
})
test('borough ground keeps horizontal texture projection and shared weather after cloning',()=>{
 const materials=createBoroughMaterials()
 try{
  const shaders=[materials.road,materials.paving,materials.parkPath].map(material=>{
   const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{} as Record<string,{value:number}>}
   material.onBeforeCompile(shader as Parameters<typeof material.onBeforeCompile>[0],{} as THREE.WebGLRenderer)
   assert.match(shader.vertexShader,/architectureWorld\.xz \/ /,'ground projects onto the horizontal plane')
   return shader
  })
  materials.finishes.setRain(true)
  for(const shader of shaders)assert.equal(shader.uniforms.miniatureRainWetness.value,1)
  materials.finishes.setRain(false)
  for(const shader of shaders)assert.equal(shader.uniforms.miniatureRainWetness.value,0)
  assert.equal(materials.paving.bumpScale,.0018,'borough relief retains its physical scale')
 }finally{materials.dispose()}
})
test('one continuous extract contains the full boundary and every listed venue, including nearby clubs',()=>{
 assert.equal(boroughGeography.boundarySource,'https://api.openstreetmap.org/api/0.6/relation/51821/full')
 assert.deepEqual(boroughGeography.boundary[0],boroughGeography.boundary.at(-1))
 for(const point of [...boroughGeography.boundary,...venues.map(v=>projectPoint(v.lng,v.lat))])assert.ok(point[0]>=boroughBounds.minX&&point[0]<=boroughBounds.maxX&&point[1]>=boroughBounds.minZ&&point[1]<=boroughBounds.maxZ)
 for(const id of ['highbury-fields','islington-tennis-centre','rosemary-gardens','tufnell-park','elizabeth-garrett-anderson','coolhurst','barbican']){const venue=venues.find(v=>v.id===id)!;assert.ok(courtsNearVenue(venue.lat,venue.lng).length>0,id)}
 assert.equal(courtsNearVenue(51.525318,-.1078098).length,0,'Spa Fields does not acquire invented tennis footprints')
 assert.equal(courtsNearVenue(51.5462388,-.1211113).length,2,'indoor Centre courts are not drawn outside the hall')
})
test('all content-addressed cells exist, totals match, and building footprints have one owner',()=>{
 const counts={buildings:0,roads:0,parks:0,trees:0,railways:0,water:0},ids=new Set<string>()
 for(const cell of boroughGeography.cells){
  assert.match(cell.url,/^map\/islington\/-?\d+_-?\d+-[a-f0-9]{10}\.json$/)
  const data=JSON.parse(fs.readFileSync(path.join(dir,cell.url),'utf8')) as BoroughCell
  for(const kind of Object.keys(counts) as (keyof typeof counts)[]){assert.equal(data[kind].length,cell.counts[kind]);counts[kind]+=data[kind].length}
  for(const f of data.buildings){assert.ok(!ids.has(String(f.id)),`duplicate ${f.id}`);ids.add(String(f.id));assert.deepEqual(f.points[0],f.points.at(-1))}
 }
 assert.deepEqual(counts,boroughGeography.counts)
 assert.ok(fs.statSync(path.join(dir,'map/islington-overview.png')).size>100000)
 assert.equal(new Set(boroughCourts.map(c=>c.id)).size,boroughCourts.length)
})
test('rich cell walls retain source footprint vertices and pitched detail stays finite',()=>{
 const cell=boroughGeography.cells.find(c=>c.x>80&&c.x<120&&c.z<0&&c.z> -40)!
 const data=JSON.parse(fs.readFileSync(path.join(dir,cell.url),'utf8')) as BoroughCell
 const materials=createBoroughMaterials(),tile=createBoroughTile(data,materials)
 try{
  assert.equal(tile.root.userData.coverage.buildings,data.buildings.length)
  const wallVertices:number[][]=[]
  tile.root.traverse(o=>{if(o instanceof THREE.Mesh){assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));if(o.name==='Borough mapped walls'){const a=o.geometry.getAttribute('position');for(let i=0;i<a.count;i++)wallVertices.push([a.getX(i),a.getZ(i)])}}})
  for(const f of data.buildings.slice(0,12))for(const [x,z] of f.points)assert.ok(wallVertices.some(p=>Math.abs(p[0]-x)<.00002&&Math.abs(p[1]-z)<.00002))
  assert.ok(tile.root.children.some(o=>o.name==='Borough footprint roofs'))
  assert.ok(Math.abs(buildingHeight({height:'12'})-1.2)<1e-10)
  assert.ok(Math.abs(buildingHeight({'building:levels':'4'})-1.2)<1e-10)
  assert.ok(Number.isFinite(buildingHeight({height:'unknown'})))
 }finally{tile.dispose();materials.dispose()}
})

test('Stringer movement stays at a bounded physical speed after extended map animation',()=>{
 const world=createIslington(venues)
 try{
  let previous=world.vanPosition.clone(),maximum=0
  for(let frame=1;frame<=600;frame++){world.animate(frame/60,false,true,false);maximum=Math.max(maximum,world.vanPosition.distanceTo(previous));previous.copy(world.vanPosition)}
  assert.ok(maximum<.012,`van step ${maximum} exceeds the five-metres-per-second route speed`)
 }finally{world.dispose()}
})

test('bus follow anchors share the rendered vehicle position and freeze with world motion',()=>{
 const world=createIslington(venues),point=new THREE.Vector3(),before=new THREE.Vector3()
 try{
  assert.equal(world.startBusRide('missing'),false)
  assert.equal(world.startBusRide('19'),true)
  world.busPosition('19',point)
  assert.ok(point.distanceTo(world.anchors.get('highbury-fields')!)<30,'ride begins near the courts on the existing route')
  assert.equal(world.busPosition('missing',point),false)
  assert.equal(world.busPosition('19',before),true)
  assert.ok(before.toArray().every(Number.isFinite))
  for(let frame=1;frame<=120;frame++)world.animate(frame/60,true,true,true)
  assert.equal(world.busPosition('19',point),true)
  assert.ok(point.distanceTo(before)>.1,'the selected vehicle actually travels')
  before.copy(point)
  world.animate(3,false,false,false);world.busPosition('19',point)
  assert.ok(point.distanceTo(before)<1e-9,'pause freezes the vehicle and its follow anchor')
 }finally{world.dispose()}
})

test('a shed-sized building with no recorded height stays one storey, and a terrace does not',()=>{
 const square=(metres:number)=>{const side=Math.sqrt(metres)/10;return [[0,0],[side,0],[side,side],[0,side],[0,0]]}
 assert.ok(Math.abs(footprintArea(square(100))-1)<1e-9)
 assert.equal(buildingHeight({building:'yes'},square(13)),.32)
 assert.equal(buildingHeight({building:'yes'},square(60)),.95)
 assert.ok(Math.abs(buildingHeight({building:'yes',height:'12'},square(13))-1.2)<1e-10,'a recorded height always wins')
})

test('3D detail appears only once its budget nearly fills the view',()=>{
 const cells=Array.from({length:40},(_,i)=>({x:i*40,z:0})),target={x:0,z:0}
 assert.equal(detailCellLimit(1440),20);assert.equal(detailCellLimit(390),16)
 assert.deepEqual(detailCellsInView(cells.slice(0,26),target,20),[],'too many cells: flat overview, not a patch')
 const shown=detailCellsInView(cells.slice(0,25),target,20)
 assert.equal(shown.length,20);assert.equal(shown[0].x,0);assert.equal(shown.at(-1)!.x,19*40)
})

test('the wash covers everything outside the real boundary and nothing inside it',()=>{
 const positions=washGeometry(boroughGeography.boundary).getAttribute('position'),index=washGeometry(boroughGeography.boundary).getIndex()!
 const washed=(x:number,z:number)=>{for(let i=0;i<index.count;i+=3){const [a,b,c]=[0,1,2].map(k=>[positions.getX(index.getX(i+k)),positions.getZ(index.getX(i+k))]);const side=(p:number[],q:number[])=>(x-q[0])*(p[1]-q[1])-(p[0]-q[0])*(z-q[1]);const s=[side(a,b),side(b,c),side(c,a)];if(s.every(v=>v>=0)||s.every(v=>v<=0))return true}return false}
 const highbury=venues.find(v=>v.id==='highbury-fields')!,[x,z]=projectPoint(highbury.lng,highbury.lat)
 assert.equal(washed(x,z),false)
 for(const place of BOROUGH_NEIGHBOURS){assert.equal(containsPoint(place.x,place.z,boroughGeography.boundary),false,place.name);assert.equal(washed(place.x,place.z),true,place.name)}
 assert.equal(boundaryStrength(6),1);assert.equal(boundaryStrength(25),0)
 assert.equal(washStrength(5),1);assert.equal(washStrength(12),0,'the wash has gone by the time you are looking at a place')
 assert.ok(positions.getY(0)<.014,'below every court playing surface')
})

test('every park walk tree stays in its park and clear of courts',()=>{
 for(const cell of boroughGeography.cells.slice(0,300)){
  const data=JSON.parse(fs.readFileSync(path.join(dir,cell.url),'utf8')) as BoroughCell
  const sites=avenueTreeSites(data);assert.ok(sites.length<=36)
  for(const site of sites){
   assert.ok(data.parks.some(p=>containsPoint(site.x,site.z,p.points)),cell.id)
   assert.ok(!data.buildings.some(b=>containsPoint(site.x,site.z,b.points)),cell.id)
   assert.ok(!boroughCourts.some(c=>Math.hypot(c.x-site.x,c.z-site.z)<Math.max(c.width,c.depth)),cell.id)
  }
 }
})

test('phones get a smaller overview with the same proportions as the full map',()=>{
 for(const file of ['map/islington-overview.png','map/islington-overview-phone.webp'])assert.ok(fs.statSync(path.join(dir,file)).size>100000,file)
 assert.ok(fs.statSync(path.join(dir,'map/islington-overview-phone.webp')).size<fs.statSync(path.join(dir,'map/islington-overview.png')).size/3)
})

test('every mapped court belongs to a listed venue or a named site, never both or neither',()=>{
 const linked=new Set(venues.flatMap(v=>courtsNearVenue(v.lat,v.lng).map(c=>c.id)))
 const named=otherCourtPins.flatMap(site=>site.courts.map(c=>c.id))
 assert.equal(new Set(named).size,named.length,'a court appears under one site only')
 for(const court of boroughCourts)assert.equal(linked.has(court.id)!==named.includes(court.id),true,`court ${court.id}`)
 for(const site of otherCourtPins){assert.equal(site.courts.length,site.courtIds.length,site.name);assert.ok(Number.isFinite(site.x)&&site.name.length>2)}
})

