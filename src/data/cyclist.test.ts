import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createMiniatureCyclist} from '../scene/miniatureCyclist.ts'

test('cycling feet stay on opposite pedals and articulated legs stay joined through a full revolution',()=>{
  const cyclist=createMiniatureCyclist('#547d77'),limbs=cyclist.root.getObjectByName('Cyclist pedalling limbs') as THREE.InstancedMesh
  const matrix=new THREE.Matrix4(),foot=[new THREE.Vector3(),new THREE.Vector3()]
  const joint=(index:number,end:number)=>{
    limbs.getMatrixAt(index,matrix)
    return new THREE.Vector3(0,end*.5,0).applyMatrix4(matrix)
  }
  for(let frame=0;frame<120;frame++){
    cyclist.advance(3.2/120)
    for(let leg=0;leg<2;leg++){
      limbs.getMatrixAt(4+leg,matrix);foot[leg].setFromMatrixPosition(matrix)
      assert.ok(Math.abs(Math.hypot(foot[leg].y-.53,foot[leg].z+.05)-.16)<1e-6,'foot remains on its crank circle')
      assert.ok(joint(leg*2,1).distanceTo(joint(leg*2+1,-1))<1e-6,'upper and lower leg meet at the knee')
      assert.ok(joint(leg*2+1,1).distanceTo(foot[leg])<1e-6,'ankle stays with the pedal')
    }
    assert.ok(Math.abs(foot[0].y+foot[1].y-1.06)<1e-6)
    assert.ok(Math.abs(foot[0].z+foot[1].z+.1)<1e-6)
    const bounds=new THREE.Box3().setFromObject(cyclist.root)
    assert.ok(bounds.min.y>=0&&bounds.max.y<1.95&&bounds.min.z>-.93&&bounds.max.z<.93,'pedalling retains the original road-user envelope')
  }
})

test('pedalling follows distance rather than frame count and does not change at rest',()=>{
  const fast=createMiniatureCyclist('#547d77'),slow=createMiniatureCyclist('#547d77')
  const pose=(r:typeof fast)=>Array.from((r.root.getObjectByName('Cyclist pedalling limbs') as THREE.InstancedMesh).instanceMatrix.array)
  const original=pose(fast)
  for(let i=0;i<60;i++)fast.advance(1/60)
  for(let i=0;i<20;i++)slow.advance(1/20)
  pose(fast).forEach((v,i)=>assert.ok(Math.abs(v-pose(slow)[i])<1e-6))
  assert.notDeepEqual(pose(fast),original,'travelling changes the leg pose')
  const paused=pose(fast);fast.advance(0);assert.deepEqual(pose(fast),paused)
  fast.advance(2.2)
  pose(fast).forEach((v,i)=>assert.ok(Math.abs(v-original[i])<1e-6,'one crank revolution returns to the original pose'))
})
