import test from 'node:test'
import assert from 'node:assert/strict'
import {createCourtNetGeometries} from '../scene/courtNet.ts'

test('net and tape share the same scaled sag while endpoints and net base stay fixed',()=>{
 for(const [height,tapeHeight] of [[.8,.08],[.67,.065],[.65,.045]]){
  const {net,tape,sag}=createCourtNetGeometries(height,tapeHeight)
  try{
   for(const [geometry,scale] of [[net,height],[tape,tapeHeight]] as const){
    const p=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv')
    const centre:number[]=[],ends:number[]=[]
    for(let i=0;i<p.count;i++){
     assert.ok([p.getX(i),p.getY(i),p.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i),uv.getX(i),uv.getY(i)].every(Number.isFinite))
     if(Math.abs(p.getX(i))<1e-6)centre.push(p.getY(i))
     if(Math.abs(Math.abs(p.getX(i))-.5)<1e-6)ends.push(p.getY(i))
    }
    assert.ok(Math.abs(Math.max(...ends)-.5)<1e-6)
    assert.ok(Math.abs((.5-Math.max(...centre))*scale-sag)<1e-6)
    assert.ok(geometry.boundingSphere!.radius>0)
   }
   assert.ok(Math.abs(net.boundingBox!.min.y+.5)<1e-6)
  }finally{net.dispose();tape.dispose()}
 }
})
