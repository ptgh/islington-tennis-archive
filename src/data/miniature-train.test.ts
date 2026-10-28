import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createMiniatureTrain} from '../scene/miniatureTrain.ts'

function dispose(root:THREE.Object3D){
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>()
 root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}})
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())
}

test('five detailed train coaches retain body size, coupling clearance and rail contact',()=>{
 const train=createMiniatureTrain()
 try{
  assert.equal(train.carriages.length,5)
  for(const coach of train.carriages){
   const bounds=new THREE.Box3().setFromObject(coach)
   assert.ok(bounds.min.x>=-1.431&&bounds.max.x<=1.431)
   assert.ok(bounds.min.z>=-4.401&&bounds.max.z<=4.401,'couplers leave clearance within the existing 8.9 spacing')
   assert.ok(Math.abs(bounds.min.y+.25-.18)<.000001,'wheel bottoms meet the existing rail-head height')
   assert.ok(bounds.max.y<=2.321,'roof height remains unchanged')
   const wheels=coach.getObjectByName('Train wheels') as THREE.InstancedMesh
   assert.ok(wheels);assert.equal(wheels.count,8,'two bogies each carry two pairs of wheels')
   assert.ok(coach.children.length<=12,'detail stays below the former 15 separate body/window meshes per coach')
   coach.traverse(o=>{
    if(o instanceof THREE.InstancedMesh)assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite))
   })
  }
 }finally{dispose(train.root)}
})

test('train end lamps and windows switch with night mode without moving or rebuilding coaches',()=>{
 const train=createMiniatureTrain(),head=train.root.getObjectByName('Train headlamps') as THREE.InstancedMesh,tail=train.root.getObjectByName('Train tail lamps') as THREE.InstancedMesh
 try{
  assert.ok(head&&tail);assert.equal(head.count,2);assert.equal(tail.count,2)
  assert.equal(head.parent,train.carriages[0]);assert.equal(tail.parent,train.carriages[4])
  const transform=new THREE.Matrix4(),position=new THREE.Vector3()
  for(let i=0;i<2;i++){
   head.getMatrixAt(i,transform);position.setFromMatrixPosition(transform);assert.ok(position.z>3.95,'headlamps sit outside the blue front body')
   tail.getMatrixAt(i,transform);position.setFromMatrixPosition(transform);assert.ok(position.z< -3.95,'rear lamps sit outside the rear body')
  }
  const gm=(train.carriages[0].children.find(m=>m instanceof THREE.Mesh&&(m.material as THREE.MeshStandardMaterial).emissive.getHexString()==='e8c27b') as THREE.Mesh).material as THREE.MeshStandardMaterial
  const hm=head.material as THREE.MeshStandardMaterial,tm=tail.material as THREE.MeshStandardMaterial,versions=[hm.version,tm.version,gm.version]
  const positions=train.carriages.map(c=>c.position.toArray()),matrices=head.instanceMatrix.array.slice()
  for(let i=0;i<3;i++){
   train.setNight(true);assert.equal(hm.emissiveIntensity,1);assert.equal(tm.emissiveIntensity,.65);assert.equal(gm.emissiveIntensity,.65)
   train.setNight(false);assert.equal(hm.emissiveIntensity,.03);assert.equal(tm.emissiveIntensity,.02);assert.equal(gm.emissiveIntensity,.1)
   assert.deepEqual([hm.version,tm.version,gm.version],versions)
   assert.deepEqual(head.instanceMatrix.array,matrices)
   assert.deepEqual(train.carriages.map(c=>c.position.toArray()),positions)
  }
 }finally{dispose(train.root)}
})
