import test from 'node:test'
import assert from 'node:assert/strict'
import { createFootprintRoof, createFootprintGables } from '../scene/footprintRoof.ts'

test('long mapped terraces retain their footprint and gain a raised continuous ridge', () => {
  const roof = createFootprintRoof([[-6,-60],[6,-60],[6,60],[-6,60],[-6,-60]], {x:0,z:0,width:12,angle:0}, 8, 3)
  const p = roof.getAttribute('position'), n = roof.getAttribute('normal')
  const heights = []
  for (let i=0;i<p.count;i++) {
    assert.ok(Math.abs(p.getX(i))<=6 && Math.abs(p.getZ(i))<=60)
    assert.ok(n.getY(i)>0)
    heights.push(p.getY(i))
  }
  assert.equal(Math.max(...heights),11)
  assert.equal(Math.min(...heights),8)
  roof.dispose()
})

test('mapped gables close both roof ends, match the ridge and face outwards in either ring winding',()=>{
 const ring=[[-6,-60],[6,-60],[6,60],[-6,60],[-6,-60]]
 for(const points of [ring,[...ring].reverse()]){
  const g=createFootprintGables(points,{x:0,z:0,width:12,angle:0},8,3),p=g.getAttribute('position'),n=g.getAttribute('normal')
  try{
   const ends=new Set<number>(),heights=[]
   for(let i=0;i<p.count;i++){
    assert.ok(Math.abs(Math.abs(p.getZ(i))-60)<.00001,'gable stays on a mapped end wall')
    assert.ok(p.getY(i)>=8&&p.getY(i)<=11)
    assert.ok(p.getX(i)*n.getX(i)+p.getZ(i)*n.getZ(i)>0,'wall faces outward')
    ends.add(p.getZ(i));heights.push(p.getY(i))
    if(p.getY(i)>8)assert.ok(Math.abs(p.getY(i)-(8+3*(1-Math.abs(p.getX(i))/6)))<.00001,'upper edge meets the same slate slope')
   }
   assert.deepEqual([...ends].sort((a,b)=>a-b),[-60,60]);assert.equal(Math.max(...heights),11)
  }finally{g.dispose()}
 }
})

test('concave mapped gables stay on source wall edges without bridging a cut-out',()=>{
 const ring=[[-6,-10],[6,-10],[6,-2],[1,-2],[1,3],[6,3],[6,10],[-6,10],[-6,-10]],g=createFootprintGables(ring,{x:0,z:0,width:12,angle:0},8,3),p=g.getAttribute('position')
 try{for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i)
  assert.ok(Number.isFinite(x+p.getY(i)+z))
  assert.ok(ring.slice(1).some((b,j)=>{const a=ring[j],dx=b[0]-a[0],dz=b[1]-a[1],t=((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz);return t>=-.00001&&t<=1.00001&&Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<.00001}),'every gable vertex lies on an original wall')
 }}finally{g.dispose()}
})
