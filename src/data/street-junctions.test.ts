import test from 'node:test'
import assert from 'node:assert/strict'
import {streetCornerFillets,streetCornerBorder,streetCornerEdgeClipper,type StreetSegment} from '../scene/streetNetwork.ts'

const horizontal:StreetSegment={a:[-20,0],b:[20,0],width:6}
const vertical:StreetSegment={a:[0,-20],b:[0,20],width:6}

test('crossroads gain tangent corner arcs without narrowing or moving either road',()=>{
 const before=structuredClone([horizontal,vertical]),corners=streetCornerFillets(horizontal,vertical)
 assert.equal(corners.length,4)
 assert.deepEqual([horizontal,vertical],before)
 for(const {corner,center,radius,arc} of corners){
  assert.ok(arc.length>=3)
  for(const p of arc){
   assert.ok(Math.abs(Math.hypot(p[0]-center[0],p[1]-center[1])-radius)<1e-6)
   assert.ok(Math.abs(p[0])>=3-1e-6&&Math.abs(p[1])>=3-1e-6,'added corners stay outside both traffic lanes')
  }
  assert.ok(Math.abs(arc[0][1]-corner[1])<1e-6&&Math.abs(arc.at(-1)![0]-corner[0])<1e-6,'arcs meet the original straight edges')
  assert.ok(Math.abs(arc[0][0]-center[0])<1e-6&&Math.abs(arc.at(-1)![1]-center[1])<1e-6,'tangents align with the straight kerbs')
 }
})

test('corner paving follows its kerb through pavement-width changes without isolated wedges',()=>{
 for(const corner of streetCornerFillets(horizontal,vertical)){
  const original=structuredClone(corner),border=streetCornerBorder(corner,.16,1.2)
  assert.deepEqual(corner,original)
  border.arc.forEach((p,i)=>{
   const width=.16+(1.2-.16)*i/(border.arc.length-1)
   assert.ok(Math.abs(Math.hypot(p[0]-corner.arc[i][0],p[1]-corner.arc[i][1])-width)<1e-6)
  })
  assert.ok(streetCornerBorder(corner,20,20).arc.every(p=>p[0]===corner.center[0]&&p[1]===corner.center[1]),'small island tips never produce inverted paving')
 }
})

test('T junctions round only the meeting side; unrelated and parallel streets gain no patches',()=>{
 const corners=streetCornerFillets(horizontal,{a:[0,0],b:[0,20],width:6})
 assert.equal(corners.length,2)
 assert.ok(corners.every(f=>f.arc.every(p=>p[1]>=3-1e-6)))
 for(const road of [
  {a:[0,25],b:[0,40],width:6},
  {a:[-20,10],b:[20,10],width:6},
  {a:[0,0],b:[0,0],width:6},
  {a:[0,-20],b:[0,20],width:0},
 ] as StreetSegment[])assert.deepEqual(streetCornerFillets(horizontal,road),[])
})

test('closely spaced junctions remove kerbs covered by another rounded corner',()=>{
 const corners=streetCornerFillets(horizontal,vertical),primary=corners.find(f=>f.corner[0]>0&&f.corner[1]>0)!
 const shifted=(s:StreetSegment):StreetSegment=>({...s,a:s.a.map(n=>n+.5),b:s.b.map(n=>n+.5)})
 const neighbours=streetCornerFillets(shifted(horizontal),shifted(vertical)),clip=streetCornerEdgeClipper([...corners,...neighbours])
 assert.deepEqual(clip([3.1,3.2],[3.2,3.1]),[],'old straight kerbs no longer remain inside the new asphalt')
 const crossing=clip([3.2,3.2],[6,3.2])
 assert.equal(crossing.length,1)
 assert.ok(crossing[0][0][0]>4&&crossing[0][0][0]<6)
 assert.deepEqual(crossing[0][1],[6,3.2])
 const fullLength=primary.arc.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-primary.arc[i][0],p[1]-primary.arc[i][1]),0)
 const keptLength=primary.arc.slice(1).flatMap((p,i)=>clip(primary.arc[i],p,primary)).reduce((n,[a,b])=>n+Math.hypot(b[0]-a[0],b[1]-a[1]),0)
 assert.ok(keptLength<fullLength-.1,'a curved kerb also clears neighbouring corner surfaces')
 const ownClip=streetCornerEdgeClipper([primary])
 assert.deepEqual(ownClip([3.1,3.2],[3.2,3.1],primary),[[[3.1,3.2],[3.2,3.1]]],'a curve can retain its own boundary')
 assert.deepEqual(clip([-20,-10],[-10,-10]),[[[-20,-10],[-10,-10]]])
})

test('oblique and unequal roads keep corner tangencies on finite strips and cap pointed island extensions',()=>{
 const first:StreetSegment={a:[-30,-10],b:[30,10],width:8}
 for(const second of [
  {a:[-12,-30],b:[12,30],width:4.6},
  {a:[-30,-20],b:[30,20],width:6},
  {a:[0,-3],b:[0,3],width:6},
 ] as StreetSegment[]){
  const corners=streetCornerFillets(first,second)
  if(second.b[1]>3)assert.ok(corners.length>0)
  for(const f of corners){
   for(const end of [f.arc[0],f.arc.at(-1)!])assert.ok(Math.hypot(end[0]-f.corner[0],end[1]-f.corner[1])<=4.000001)
   for(const [road,end] of [[first,f.arc[0]],[second,f.arc.at(-1)!]] as const){
    const dx=road.b[0]-road.a[0],dz=road.b[1]-road.a[1],length=Math.hypot(dx,dz)
    const along=((end[0]-road.a[0])*dx+(end[1]-road.a[1])*dz)/length
    const across=Math.abs((-(end[0]-road.a[0])*dz+(end[1]-road.a[1])*dx)/length)
    assert.ok(along>=0&&along<=length,'no invented edge beyond a finite road end')
    assert.ok(Math.abs(across-road.width/2)<1e-6)
   }
  }
 }
})
