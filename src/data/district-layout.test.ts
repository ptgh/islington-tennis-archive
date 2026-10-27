import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {districtGeography,districtFeatures,districtBounds,districtBuildingHeight,districtClosed,districtCentre} from '../scene/districtLayout.ts'
import {projectPoint} from '../scene/courtGeometry.ts'
import {createMappedDistrict} from '../scene/createMappedDistrict.ts'
import {venues} from './venues.ts'

const inside=(p:number[],ring:number[][])=>{
 let hit=false
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j]
  if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit
 }
 return hit
}

test('accuracy pilot retains sourced footprints and shared street nodes at one geographic scale',()=>{
 assert.match(districtGeography.license,/openstreetmap.org\/copyright/)
 assert.equal(districtFeatures.length,districtGeography.features.length)
 assert.equal(districtFeatures.length,1998)
 for(let i=0;i<districtFeatures.length;i++){
  const mapped=districtFeatures[i],source=districtGeography.features[i]
  assert.equal(mapped.id,source.id)
  assert.deepEqual(mapped.points,source.points.map(([lng,lat])=>projectPoint(lng,lat)),'source vertices and shared junctions are never repositioned')
  assert.ok(mapped.points.flat().every(Number.isFinite))
  assert.ok(!['construction','proposed'].includes(mapped.tags.highway))
 }
 const centre=districtFeatures.find(f=>f.id===30198196)!
 assert.ok(districtClosed(centre.points));assert.equal(centre.points.length,7,'the six-sided hall footprint stays intact')
 assert.ok(districtGeography.omittedAreaRelations>0,'incomplete area coverage is disclosed')
})

test('mapped tower is inside Caledonian Park and outdoor courts retain regulation-scale dimensions',()=>{
 const park=districtFeatures.find(f=>f.id===17999028)!,tower=districtFeatures.find(f=>f.id===37371124)!
 const point=districtCentre(tower.points)
 assert.ok(inside(point,park.points),'tower belongs in the park, not beside a fictional station frontage')
 const old=projectPoint(-.1225,51.5485)
 assert.ok(Math.hypot(point[0]-old[0],point[1]-old[1])*10>160,'the old landmark pin was more than 160 m away')
 for(const id of [161419463,161419464]){
  const b=districtBounds(districtFeatures.find(f=>f.id===id)!.points)
  assert.ok(b.width*10>10&&b.width*10<12)
  assert.ok(b.depth*10>22&&b.depth*10<25,'court display is not inflated to miniature scale')
 }
 assert.equal(districtBuildingHeight(tower).metres,47.5)
 assert.equal(districtBuildingHeight(tower).estimated,false)
 assert.equal(districtBuildingHeight({id:1,tags:{building:'yes'},points:[]}).estimated,true)
 assert.equal(districtBuildingHeight({id:1,tags:{building:'yes',height:'12 m'},points:[]}).metres,12)
})

test('mapped district builds finite bounded tower geometry, mapped tree proxies and clean disposal',()=>{
 const world=createMappedDistrict(venues)
 try{
  const tower=world.root.getObjectByName('Mapped Caledonian Clock Tower')!
  assert.ok(tower)
  const bounds=new THREE.Box3().setFromObject(tower)
  assert.ok(Math.abs(bounds.max.y-4.75)<.001,'council-reported tower height uses the same ten-metre scale')
  assert.ok(world.root.userData.coverage.buildings>=1000)
  let vertices=0,proxies=0
  world.root.traverse(object=>{
   if(!(object instanceof THREE.Mesh))return
   const position=object.geometry.getAttribute('position')
   assert.ok(Array.from(position.array).every(Number.isFinite));vertices+=position.count
   if(object instanceof THREE.InstancedMesh){
    assert.ok(Array.from(object.instanceMatrix.array).every(Number.isFinite))
    if(object.layers.mask===2)proxies++
   }
  })
  assert.ok(vertices>100000);assert.equal(proxies,1)
  world.setNight(true);world.setRain(true);world.setWind(.04)
  world.animate(2,false,true,false);world.setNight(false);world.animate(3,false,false,false)
  assert.equal(world.courtFocusAnchors.has('highbury-fields'),false,'pilot never substitutes a false Highbury destination')
 }finally{world.dispose()}
})
