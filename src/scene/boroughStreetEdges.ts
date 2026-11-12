import type { GeoFeature } from './boroughGeometry.ts'
import { streetDashPieces, streetEdgePieces, type StreetSegment } from './streetNetwork.ts'

type EdgePiece=[number[],number[]]
type Point=[number,number]
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

/** Kerbs and paint follow existing carriageways. A small spatial index keeps
 * junction clearance local to the cell. */
export function boroughStreetDecorations(roads:GeoFeature[]) {
 const streets=roads.flatMap(road=>{
  const profile=boroughRoadProfile(road.kind)
  const way=String(road.id).split(':')[0]
  return road.points.slice(1).map((b,i)=>({a:road.points[i] as Point,b:b as Point,way,...profile})).filter(s=>Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1])>=.05)
 })
 const grid=new Map<string,Set<typeof streets[number]>>(),cellSize=4,kerbClearance=.025,paintClearance=.08
 function buckets(a:readonly number[],b:readonly number[],radius=0){
  const keys:string[]=[]
  for(let x=Math.floor((Math.min(a[0],b[0])-radius)/cellSize);x<=Math.floor((Math.max(a[0],b[0])+radius)/cellSize);x++)
   for(let z=Math.floor((Math.min(a[1],b[1])-radius)/cellSize);z<=Math.floor((Math.max(a[1],b[1])+radius)/cellSize);z++)keys.push(`${x},${z}`)
  return keys
 }
 for(const street of streets)for(const key of buckets(street.a,street.b,street.width/2+paintClearance)){
  const nearby=grid.get(key)??new Set();nearby.add(street);grid.set(key,nearby)
 }
 function clearJunctions(a:Point,b:Point,skip:(street:typeof streets[number])=>boolean,clearance:number){
  const nearby=new Set<typeof streets[number]>()
  const minX=Math.min(a[0],b[0]),maxX=Math.max(a[0],b[0]),minZ=Math.min(a[1],b[1]),maxZ=Math.max(a[1],b[1])
  for(const key of buckets(a,b))for(const neighbor of grid.get(key)??[]){
   if(skip(neighbor)||nearby.has(neighbor))continue
   const radius=neighbor.width/2+clearance
   if(maxX<Math.min(neighbor.a[0],neighbor.b[0])-radius||minX>Math.max(neighbor.a[0],neighbor.b[0])+radius||
      maxZ<Math.min(neighbor.a[1],neighbor.b[1])-radius||minZ>Math.max(neighbor.a[1],neighbor.b[1])+radius)continue
   nearby.add(neighbor)
  }
  let pieces:EdgePiece[]=streetEdgePieces(a,b,[...nearby],clearance)
  for(const neighbor of nearby)for(const center of [neighbor.a,neighbor.b])pieces=pieces.flatMap(piece=>outsideCap(piece,center,neighbor.width/2+clearance))
  return pieces
 }
 const edges:StreetSegment[]=[]
 const runs=new Map<string,Point[][]>()
 for(const street of streets){
  if(street.walking)continue
  if(street.width>=.75){
   const wayRuns=runs.get(street.way)??[],last=wayRuns.at(-1),end=last?.at(-1)
   // Imported segments are ordered along each source way. A missing span
   // starts a separate run so paint cannot bridge a gap in this cell.
   if(last&&end?.[0]===street.a[0]&&end[1]===street.a[1])last.push(street.b)
   else wayRuns.push([street.a,street.b])
   runs.set(street.way,wayRuns)
  }
  const dx=street.b[0]-street.a[0],dz=street.b[1]-street.a[1],length=Math.hypot(dx,dz)
  for(const side of [-1,1]){
   const offset=(street.width/2+.012)*side,nx=-dz/length*offset,nz=dx/length*offset
   const a:Point=[street.a[0]+nx,street.a[1]+nz],b:Point=[street.b[0]+nx,street.b[1]+nz]
   for(const [start,end] of clearJunctions(a,b,neighbor=>neighbor===street,kerbClearance))edges.push({a:start,b:end,width:.018})
  }
 }
 const markings:StreetSegment[]=[]
 for(const [way,wayRuns] of runs)for(const points of wayRuns)for(const [a,b] of streetDashPieces(points,.23,.67)){
  for(const [start,end] of clearJunctions(a,b,neighbor=>neighbor.way===way,paintClearance))markings.push({a:start,b:end,width:.014})
 }
 return {edges,markings}
}
