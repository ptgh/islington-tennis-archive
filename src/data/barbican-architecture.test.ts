import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { buildingHeight, type BoroughCell } from '../scene/boroughGeometry.ts';
import { createBoroughMaterials, createBoroughTile } from '../scene/createBoroughTile.ts';

const features=['3_7-d14e2a3a94','3_8-275369d3f8'].flatMap(file=>(JSON.parse(fs.readFileSync(`public/map/islington/${file}.json`,'utf8')) as BoroughCell).buildings);
for(const id of [34038683,34038684,34038685,34038687,177832589])test(`Barbican ${id} keeps its mapped base, height and holes with bounded facade detail`,()=>{
 const f=features.find(f=>Number(f.id)===id)!;assert.ok(f);
 const original=JSON.stringify(f),materials=createBoroughMaterials();
 const tile=createBoroughTile({buildings:[f],roads:[],parks:[],trees:[],railways:[],water:[]},materials);
 try{
  const wall=tile.root.children.find(o=>o.name==='Barbican concrete') as THREE.Mesh;assert.ok(wall?.castShadow);
  const p=wall.geometry.getAttribute('position');
  for(const [x,z] of f.points)assert.ok(Array.from({length:p.count},(_,i)=>i).some(i=>Math.abs(p.getX(i)-x)<.00003&&Math.abs(p.getZ(i)-z)<.00003&&Math.abs(p.getY(i)-.012)<.00001));
  const bounds=new THREE.Box3().setFromObject(tile.root);assert.ok(Math.abs(bounds.max.y-(buildingHeight(f.tags,f.points)+.0625))<.00002);
  let instances=0;tile.root.traverse(o=>{if(o instanceof THREE.InstancedMesh)instances+=o.count;if(o instanceof THREE.Mesh)assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));});assert.ok(instances<12000);
  assert.equal(JSON.stringify(f),original);assert.equal(tile.root.userData.coverage.buildings,1);
  let disposed=false;wall.geometry.addEventListener('dispose',()=>disposed=true);tile.dispose();assert.ok(disposed);
 }finally{materials.dispose();}
});
test('a different building never inherits the Barbican treatment',()=>{
 const materials=createBoroughMaterials(),f={...features.find(f=>Number(f.id)===34038684)!,id:34038686};
 const tile=createBoroughTile({buildings:[f],roads:[],parks:[],trees:[],railways:[],water:[]},materials);
 try{assert.ok(!tile.root.children.some(o=>o.name==='Barbican concrete'));}finally{tile.dispose();materials.dispose();}
});
