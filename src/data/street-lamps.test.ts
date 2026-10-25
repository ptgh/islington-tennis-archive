import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createStreetLamps} from '../scene/createStreetLamps.ts'

test('streetlight arms connect their posts and lenses on straight and diagonal streets',()=>{
 const lamps=createStreetLamps([{points:[[0,0],[150,0]],width:8},{points:[[150,0],[200,100]],width:7}],[])
 try{
  const posts:THREE.Vector3[]=[],lenses:THREE.Vector3[]=[],arms:THREE.Matrix4[]=[]
  for(const object of lamps.root.children){
   if(!(object instanceof THREE.InstancedMesh))continue
   for(let i=0;i<object.count;i++){
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3()
    object.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale)
    if(Math.abs(scale.y-3.9)<.001)posts.push(position)
    if(Math.abs(scale.x-.9)<.001&&Math.abs(scale.y-.1)<.001)arms.push(matrix)
    if(Math.abs(scale.x-.39)<.001)lenses.push(position)
   }
  }
  assert.ok(arms.length>1)
  assert.equal(arms.length,lamps.count);assert.equal(posts.length,lamps.count);assert.equal(lenses.length,lamps.count)
  const distance=(a:THREE.Vector3,b:THREE.Vector3)=>Math.hypot(a.x-b.x,a.z-b.z)
  for(const matrix of arms){
   const ends=[-.5,.5].map(x=>new THREE.Vector3(x,0,0).applyMatrix4(matrix))
   assert.ok(Math.min(...ends.flatMap(p=>posts.map(q=>distance(p,q))))<.04,'one arm end reaches its post')
   assert.ok(Math.min(...ends.flatMap(p=>lenses.map(q=>distance(p,q))))<.12,'the other end reaches the lens')
  }
 }finally{lamps.dispose();lamps.root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of [o.material].flat())m.dispose()}})}
})
