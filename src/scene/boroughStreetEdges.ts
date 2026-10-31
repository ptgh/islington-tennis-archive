import type { GeoFeature } from './boroughGeometry.ts'
import { streetEdgePieces, type StreetSegment } from './streetNetwork.ts'

type EdgePiece=[number[],number[]]
/** Source road strips have round end caps; clear those as well as the strips. */
function outsideCap([a,b]:EdgePiece,center:readonly number[],radius:number):EdgePiece[]{
 const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz,x=a[0]-center[0],z=a[1]-center[1]
 const along=x*dx+z*dz,discriminant=along*along-length2*(x*x+z*z-radius*radius)
 if(discriminant<=0)return [[a,b]]
 const root=Math.sqrt(discriminant),enter=Math.max(0,(-along-root)/length2),exit=Math.min(1,(-along+root)/length2)
 if(enter>=exit)return [[a,b]]
 const at=(t:number)=>[a[0]+dx*t,a[1]+dz*t],pieces:EdgePiece[]=[]
 if(enter>0)pieces.push([a,at(enter)])
 if(exit<1)pieces.push([at(exit),b])
 return pieces.filter(([p,q])=>Math.hypot(q[0]-p[0],q[1]-p[1])>.08)
}

/** Illustrated road widths in borough units (one unit is ten metres). */
export function boroughRoadProfile(kind = '') {
 const walking=['footway','path','pedestrian','steps','cycleway','bridleway'].includes(kind)
 return {walking,width:walking?.18:['primary','secondary','tertiary','trunk','primary_link','secondary_link'].includes(kind)?.75:kind==='service'?.32:.5}
}

/** Kerbs follow existing carriageways and leave side streets and walking
 * connections open. A small spatial index keeps cell construction local. */
export function boroughStreetEdges(roads:GeoFeature[]):StreetSegment[] {
 const streets=roads.flatMap(road=>{
  const profile=boroughRoadProfile(road.kind)
  return road.points.slice(1).map((b,i)=>({a:road.points[i],b,...profile})).filter(s=>Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1])>=.05)
 })
 const grid=new Map<string,Set<typeof streets[number]>>(),cellSize=4,clearance=.025
 function buckets(a:readonly number[],b:readonly number[],radius=0){
  const keys:string[]=[]
  for(let x=Math.floor((Math.min(a[0],b[0])-radius)/cellSize);x<=Math.floor((Math.max(a[0],b[0])+radius)/cellSize);x++)
   for(let z=Math.floor((Math.min(a[1],b[1])-radius)/cellSize);z<=Math.floor((Math.max(a[1],b[1])+radius)/cellSize);z++)keys.push(`${x},${z}`)
  return keys
 }
 for(const street of streets)for(const key of buckets(street.a,street.b,street.width/2+clearance)){
  const nearby=grid.get(key)??new Set();nearby.add(street);grid.set(key,nearby)
 }
 const edges:StreetSegment[]=[]
 for(const street of streets){
  if(street.walking)continue
  const dx=street.b[0]-street.a[0],dz=street.b[1]-street.a[1],length=Math.hypot(dx,dz)
  for(const side of [-1,1]){
   const offset=(street.width/2+.012)*side,nx=-dz/length*offset,nz=dx/length*offset
   const a=[street.a[0]+nx,street.a[1]+nz],b=[street.b[0]+nx,street.b[1]+nz],nearby=new Set<typeof streets[number]>()
   for(const key of buckets(a,b))for(const neighbor of grid.get(key)??[])if(neighbor!==street)nearby.add(neighbor)
   let pieces:EdgePiece[]=streetEdgePieces(a,b,[...nearby],clearance)
   for(const neighbor of nearby)for(const center of [neighbor.a,neighbor.b])pieces=pieces.flatMap(piece=>outsideCap(piece,center,neighbor.width/2+clearance))
   for(const [start,end] of pieces)edges.push({a:start,b:end,width:.018})
  }
 }
 return edges
}
