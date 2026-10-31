import test from 'node:test'
import assert from 'node:assert/strict'
import {streetEdgePieces,type StreetSegment} from '../scene/streetNetwork.ts'
import {boroughRoadProfile,boroughStreetEdges} from '../scene/boroughStreetEdges.ts'

test('borough kerbs preserve source roads and leave carriageways and footpath connections open',()=>{
 const roads=[
  {id:1,kind:'residential',points:[[-6,0],[6,0]]},
  {id:2,kind:'secondary',points:[[-4,-5],[-4,5]]},
  {id:3,kind:'footway',points:[[4,0],[4,2]]},
  {id:4,kind:'secondary',points:[[0,0],[0,3]]},
 ],before=structuredClone(roads),edges=boroughStreetEdges(roads)
 assert.deepEqual(roads,before)
 assert.ok(edges.length>4,'junctions split edges rather than covering their openings')
 for(const edge of edges)for(let i=0;i<=20;i++){
  const x=edge.a[0]+(edge.b[0]-edge.a[0])*i/20,z=edge.a[1]+(edge.b[1]-edge.a[1])*i/20
  for(const road of roads){
   const [a,b]=road.points,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),along=((x-a[0])*dx+(z-a[1])*dz)/length
   for(const center of [a,b])assert.ok(Math.hypot(x-center[0],z-center[1])>=boroughRoadProfile(road.kind).width/2+edge.width/2-1e-8,'rounded road ends stay clear too')
   if(along<0||along>length)continue
   const across=Math.abs(-(x-a[0])*dz+(z-a[1])*dx)/length
   assert.ok(across>=boroughRoadProfile(road.kind).width/2+edge.width/2-1e-8,'the whole kerb stays outside the road or path')
  }
 }
 assert.ok(edges.some(edge=>Math.abs(edge.a[1]+.262)<1e-8&&edge.a[0]<4&&edge.b[0]>4),'the non-meeting side of the footpath stays continuous')
})

test('walking-only and degenerate source lines do not acquire kerbs',()=>{
 assert.deepEqual(boroughStreetEdges([{id:1,kind:'path',points:[[0,0],[5,5]]},{id:2,kind:'service',points:[[2,2],[2,2]]}]),[])
})

test('raised kerbs leave the full width of a crossing road open',()=>{
 const crossing:StreetSegment={a:[0,-20],b:[0,20],width:6}
 const pieces=streetEdgePieces([-20,4],[20,4],[crossing],.2)
 assert.equal(pieces.length,2)
 assert.ok(Math.abs(pieces[0][1][0]+3.2)<1e-9)
 assert.ok(Math.abs(pieces[1][0][0]-3.2)<1e-9)
 assert.deepEqual(pieces[0][0],[-20,4]);assert.deepEqual(pieces[1][1],[20,4])
})

test('decoration clears rotated and overlapping junctions without altering source roads',()=>{
 const streets:StreetSegment[]=[{a:[-8,-8],b:[8,8],width:5},{a:[5,-8],b:[5,8],width:3}]
 const before=structuredClone(streets),pieces=streetEdgePieces([-20,0],[20,0],streets,.3)
 assert.deepEqual(streets,before)
 assert.ok(pieces.length>=2)
 for(const [a,b] of pieces)for(let t=0;t<=1;t+=.01){
  const p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
  for(const road of streets){
   const dx=road.b[0]-road.a[0],dz=road.b[1]-road.a[1],length=Math.hypot(dx,dz)
   const along=((p[0]-road.a[0])*dx+(p[1]-road.a[1])*dz)/length
   const across=Math.abs((-(p[0]-road.a[0])*dz+(p[1]-road.a[1])*dx)/length)
   assert.ok(along<0||along>length||across>=road.width/2+.299999)
  }
 }
})

test('T junctions open only the meeting side and unrelated streets retain their edges',()=>{
 const branch:StreetSegment={a:[0,0],b:[0,12],width:4}
 assert.equal(streetEdgePieces([-10,3],[10,3],[branch]).length,2)
 assert.deepEqual(streetEdgePieces([-10,-3],[10,-3],[branch]),[[[-10,-3],[10,-3]]])
 assert.deepEqual(streetEdgePieces([-10,3],[10,3],[{a:[-20,10],b:[20,10],width:4}]),[[[-10,3],[10,3]]])
})

test('fully covered and degenerate decoration does not leave tiny kerb fragments',()=>{
 assert.deepEqual(streetEdgePieces([-1,0],[1,0],[{a:[0,-5],b:[0,5],width:4}]),[])
 assert.deepEqual(streetEdgePieces([0,0],[0,0],[]),[])
 assert.deepEqual(streetEdgePieces([-1,0],[1,0],[{a:[5,5],b:[5,5],width:4}]),[[[-1,0],[1,0]]])
})
