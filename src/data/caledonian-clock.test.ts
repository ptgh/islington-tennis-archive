import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as THREE from 'three'
import { buildingHeight, type BoroughCell } from '../scene/boroughGeometry.ts'
import { createBoroughMaterials, createBoroughTile } from '../scene/createBoroughTile.ts'

const source=JSON.parse(fs.readFileSync('public/map/islington/-2_0-e99a8dfdf8.json','utf8')) as BoroughCell
const tower=source.buildings.find(f=>f.id===37371124)!
const cell=(feature= tower):BoroughCell=>({buildings:[feature],roads:[],parks:[],trees:[],railways:[],water:[]})

test('Caledonian landmark preserves its source footprint and recorded overall height with owned geometry',()=>{
 const original=JSON.stringify(tower),materials=createBoroughMaterials(),tile=createBoroughTile(cell(),materials)
 try{
  const stone=tile.root.children.find(o=>o.name==='Caledonian Tower stonework') as THREE.Mesh
  assert.ok(stone);assert.ok(stone.castShadow)
  const vertices=stone.geometry.getAttribute('position')
  for(const [x,z] of tower.points)assert.ok(Array.from({length:vertices.count},(_,i)=>i).some(i=>Math.abs(vertices.getX(i)-x)<.00002&&Math.abs(vertices.getZ(i)-z)<.00002&&Math.abs(vertices.getY(i)-.012)<.00001),'source base vertex retained')
  const bounds=new THREE.Box3().setFromObject(tile.root)
  assert.ok(Math.abs(bounds.max.y-(buildingHeight(tower.tags)+.012))<.00001,'weather vane ends at the recorded total height')
  assert.ok(Math.abs(bounds.min.y-.012)<.00001)
  assert.equal(tile.root.userData.coverage.buildings,1)
  tile.root.traverse(o=>{if(o instanceof THREE.Mesh)assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite))})
  let disposed=false;stone.geometry.addEventListener('dispose',()=>{disposed=true});tile.dispose();assert.ok(disposed)
  assert.equal(JSON.stringify(tower),original,'source geometry is never rewritten')
 }finally{materials.dispose()}
})

test('the dedicated tower treatment never matches a nearby ordinary building',()=>{
 const materials=createBoroughMaterials(),tile=createBoroughTile(cell({...tower,id:37371125}),materials)
 try{assert.ok(!tile.root.children.some(o=>o.name==='Caledonian Tower stonework'));assert.equal(tile.root.userData.coverage.buildings,1)}finally{tile.dispose();materials.dispose()}
})
