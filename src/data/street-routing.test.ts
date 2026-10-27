import test from 'node:test'
import assert from 'node:assert/strict'
import {routeStreetAroundParks,streetEndConnections,streetBendTriangles,type StreetPark} from '../scene/streetNetwork.ts'
import {courtAreas,inCourtArea,HIGHBURY_PARK} from '../scene/courtGeometry.ts'
import {venues} from './venues.ts'

type Point=[number,number]
test('bend joins fill corner notches without extending outside the road half-width',()=>{
 for(const c of [[0,10],[5,8],[-5,8]] as Point[]){
  const triangles=streetBendTriangles([-10,0],[0,0],c,6)
  assert.equal(triangles.length,2)
  for(const [a,b,c] of triangles){
   assert.ok((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0,'top faces point up')
   for(const p of [a,b,c])assert.ok(Math.hypot(p[0],p[1])<=3.000001)
  }
 }
 assert.deepEqual(streetBendTriangles([-10,0],[0,0],[10,0],6),[])
 assert.deepEqual(streetBendTriangles([0,0],[0,0],[0,10],6),[])
})
function samples(points:Point[],visit:(x:number,z:number)=>void){
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2)
  for(let j=0;j<=steps;j++){const t=j/steps;visit(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)}
 }
}

test('roads entering a park remain continuous carriageways around its perimeter',()=>{
 const park={x:0,z:0,rx:20,rz:30},source:Point[]=[[-80,0],[0,0],[80,0]],before=structuredClone(source)
 const routed=routeStreetAroundParks(source,[park],[],10)
 assert.deepEqual(source,before);assert.deepEqual(routed[0],source[0]);assert.deepEqual(routed.at(-1),source.at(-1))
 assert.ok(routed.length>3&&routed.length<40,'arcs remain smooth without retaining metre-spaced straight samples')
 samples(routed,(x,z)=>assert.ok((x/26.5)**2+(z/36.5)**2>=1,'full road and pavement clear the park'))
})

test('neighbourhood crossings stay outside real illustrated parks and court compounds',()=>{
 const parks:StreetPark[]=[HIGHBURY_PARK,{x:-32,z:-365,rx:130,rz:91},{x:-205,z:-125,rx:38,rz:45},{x:222,z:-183,rx:62,rz:90},{x:-6,z:74,rx:31,rz:44},{x:-188,z:202,rx:35,rz:40}]
 const areas=courtAreas(venues)
 for(const park of parks)for(const width of [4.6,10])for(const vertical of [false,true]){
  const source:Point[]=vertical?[[park.x,-550],[park.x,park.z],[park.x,550]]:[[-550,park.z],[park.x,park.z],[550,park.z]]
  const routed=routeStreetAroundParks(source,parks,areas,width)
  assert.deepEqual(routed[0],source[0]);assert.deepEqual(routed.at(-1),source.at(-1))
  samples(routed,(x,z)=>{
   assert.equal(inCourtArea(x,z,areas,width/2+1),false,'continuation does not enter a court')
   for(const p of parks)assert.ok(((x-p.x)/(p.rx+6.5))**2+((z-p.z)/(p.rz+6.5))**2>=1,`road enters park ${p.x},${p.z} at ${x},${z}`)
  })
 }
})

test('clipped route ends connect to another road without modifying the vehicle path',()=>{
 const source:Point[]=[[0,0],[0,20]],before=structuredClone(source),others=[{a:[-30,30],b:[30,30],width:6}]
 const links=streetEndConnections(source,others,[],5.8)
 assert.deepEqual(source,before);assert.equal(links.length,1,'do not run back along the same road from its other end')
 assert.deepEqual(links[0][0],[0,20]);assert.deepEqual(links[0].at(-1),[0,30])
 assert.deepEqual(streetEndConnections([[0,30],[20,30]],others,[],5.8),[],'already joined roads need no extra spur')
 assert.deepEqual(streetEndConnections(source,[{a:[200,200],b:[300,200],width:6}],[],5.8),[],'no invented long-distance link')
})

test('ordinary street continuations go around parks rather than making a new shortcut through them',()=>{
 const park={x:0,z:0,rx:20,rz:30},source:Point[]=[[0,-38],[0,38]]
 const links=streetEndConnections(source,[{a:[-30,50],b:[30,50],width:6}],[],6,100,[park])
 assert.equal(links.length,2)
 assert.deepEqual(links[0][0],source[0]);assert.deepEqual(links[0].at(-1),[0,50])
 samples(links[0],(x,z)=>assert.ok((x/26.5)**2+(z/36.5)**2>=1))
})
