import test from 'node:test'
import assert from 'node:assert/strict'
import {townRoofGeometry,archedOpeningGeometry} from '../scene/townArchitecture.ts'

test('varied terrace roofs retain unit footprints, eaves and outward-facing slopes',()=>{
 for(const kind of ['hipped','mansard'] as const){
  const roof=townRoofGeometry(kind),p=roof.getAttribute('position'),n=roof.getAttribute('normal')
  let low=Infinity,high=-Infinity
  assert.ok(p.count/3<=18,'roof variation keeps geometry bounded')
  for(let i=0;i<p.count;i++){
   assert.ok(Math.abs(p.getX(i))<=.5&&Math.abs(p.getZ(i))<=.5)
   low=Math.min(low,p.getY(i));high=Math.max(high,p.getY(i))
   assert.ok(n.getY(i)>0,'slope faces are visible from above')
   assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-6)
  }
  assert.equal(low,0);assert.equal(high,1)
  roof.dispose()
 }
})

test('hipped and mansard profiles produce distinct ridges and flat top silhouettes',()=>{
 const tops=(kind:'hipped'|'mansard')=>{
  const roof=townRoofGeometry(kind),p=roof.getAttribute('position'),points:number[][]=[]
  for(let i=0;i<p.count;i++)if(p.getY(i)===1)points.push([p.getX(i),p.getZ(i)])
  roof.dispose();return points
 }
 const hip=tops('hipped'),mansard=tops('mansard')
 assert.ok(hip.every(p=>p[1]===0));assert.ok(Math.max(...hip.map(p=>p[0]))<.5)
 assert.ok(Math.max(...mansard.map(p=>p[1]))-Math.min(...mansard.map(p=>p[1]))>.3)
 assert.ok(Math.max(...mansard.map(p=>p[0]))-Math.min(...mansard.map(p=>p[0]))>.7)
})

test('arched openings keep a flat base, unit envelope and outward-facing glazing',()=>{
 const arch=archedOpeningGeometry(),p=arch.getAttribute('position'),n=arch.getAttribute('normal'),uv=arch.getAttribute('uv')
 const heights:number[]=[]
 for(let i=0;i<p.count;i++){
  assert.ok(Math.abs(p.getX(i))<=.500001&&Math.abs(p.getZ(i))<1e-8)
  assert.ok(p.getY(i)>=0&&p.getY(i)<=1.000001)
  assert.ok(n.getZ(i)>.999)
  assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1.000001,'glazing UVs cover the whole opening without clamping its upper half')
  heights.push(p.getY(i))
 }
 assert.equal(Math.min(...heights),0);assert.ok(Math.abs(Math.max(...heights)-1)<1e-6)
 arch.dispose()
})
