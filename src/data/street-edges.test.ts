import test from 'node:test'
import assert from 'node:assert/strict'
import {streetEdgePieces,type StreetSegment} from '../scene/streetNetwork.ts'

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
