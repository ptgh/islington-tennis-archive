import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {places} from './places.ts';
import {createLandmarks} from '../scene/createLandmarks.ts';
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
