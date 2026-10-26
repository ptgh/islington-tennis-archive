import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {places} from './places.ts';
import {createLandmarks} from '../scene/createLandmarks.ts';
import {createMiniatureMaterials} from '../scene/miniatureMaterials.ts';
test('every selectable landmark has finite, visible building geometry at its destination',()=>{
 const project=(lat:number,lng:number)=>new THREE.Vector3((lng+.115)*6900,0,-(lat-51.549)*11100);
 const root=createLandmarks(project);
 try{for(const place of places.filter(p=>p.kind==='landmark')){
  const building=root.getObjectByName(place.id);assert.ok(building,place.name);
  assert.deepEqual(building.position.toArray(),project(place.lat,place.lng).toArray());
  const size=new THREE.Box3().setFromObject(building).getSize(new THREE.Vector3());
  assert.ok(size.toArray().every(Number.isFinite));assert.ok(size.y>5&&size.x>5&&size.z>5);
 }}finally{const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
});
test('Union Chapel nave has a ridged gable along its length, not a single-apex pyramid',()=>{
 const root=createLandmarks((lat,lng)=>new THREE.Vector3((lng+.115)*6900,0,-(lat-51.549)*11100));
 const roof=root.getObjectByName('union-chapel-roof') as THREE.Mesh;assert.ok(roof);
 roof.updateWorldMatrix(true,false);
 const position=roof.geometry.getAttribute('position'),points:THREE.Vector3[]=[];
 for(let i=0;i<position.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(roof.matrixWorld));
 const top=Math.max(...points.map(p=>p.y)),ridge=points.filter(p=>top-p.y<1e-3).map(p=>p.z);
 assert.ok(Math.max(...ridge)-Math.min(...ridge)>15,'ridge spans the 18-unit nave');
});
test('landmark relief is batched, finite and keeps the chapel inside its existing ground envelope',()=>{
 const root=createLandmarks(()=>new THREE.Vector3()),chapel=root.getObjectByName('union-chapel')!
 const batches=chapel.children.filter((n):n is THREE.InstancedMesh=>n instanceof THREE.InstancedMesh)
 assert.ok(batches.reduce((sum,mesh)=>sum+mesh.count,0)>50,'the model contains meaningful architectural relief')
 assert.ok(batches.length<=16,'detail is instanced rather than one draw per ornament')
 for(const mesh of batches)assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite))
 const bounds=new THREE.Box3().setFromObject(chapel)
 assert.ok(bounds.min.x>=-6&&bounds.max.x<=9.3,'aisles and buttresses retain the original ground envelope')
 assert.ok(bounds.min.z>=-10&&bounds.max.z<=10)
 assert.ok(bounds.max.y<=29,'steeple remains bounded')
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>()
 root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}})
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())
});

test('landmark window lighting restores daylight without changing masonry or shader programs',()=>{
 const finishes=createMiniatureMaterials(),root=createLandmarks(()=>new THREE.Vector3(),finishes);
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.MeshStandardMaterial>();
 root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m as THREE.MeshStandardMaterial));}});
 const windows=[...materials].find(m=>m.color.getHexString()==='617d77');assert.ok(windows);
 const original=[...materials].map(material=>({material,color:material.color.getHex(),emission:material.emissiveIntensity,key:material.customProgramCacheKey(),version:material.version}));
 try{
  for(let cycle=0;cycle<3;cycle++){
   root.setNight(true);
   assert.equal(windows.emissiveIntensity,.75);assert.equal(windows.emissive.getHexString(),'f2bf6d');
   assert.equal(windows.color.getHexString(),'e0bd7d');
   for(const state of original)if(state.material!==windows){assert.equal(state.material.color.getHex(),state.color);assert.equal(state.material.emissiveIntensity,state.emission);}
   root.setNight(false);
   for(const state of original){assert.equal(state.material.color.getHex(),state.color);assert.equal(state.material.emissiveIntensity,state.emission);assert.equal(state.material.customProgramCacheKey(),state.key);assert.equal(state.material.version,state.version);}
  }
 }finally{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());finishes.dispose();}
});
