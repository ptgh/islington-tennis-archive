import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { boroughGeography, boroughBounds, boroughCourts, courtsNearVenue, buildingHeight, type BoroughCell } from '../scene/boroughGeometry.ts'
import { projectPoint } from '../scene/courtGeometry.ts'
import { createBoroughMaterials, createBoroughTile } from '../scene/createBoroughTile.ts'
import { createIslington } from '../scene/createIslington.ts'
import { venues } from './venues.ts'

const dir=path.resolve('public')
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
