import geography from '../data/islington-geography.json' with { type: 'json' }
import { projectPoint } from './courtGeometry.ts'
import { otherCourtSites } from '../data/otherCourts.ts'

export type GeoFeature = { id: number | string; points: number[][]; holes?: number[][][]; tags?: Record<string,string>; kind?: string }
export type BoroughCell = { buildings: GeoFeature[]; roads: GeoFeature[]; parks: GeoFeature[]; trees: GeoFeature[]; railways: GeoFeature[]; water: GeoFeature[] }
export const boroughGeography = geography
const [west,south,east,north]=geography.bbox
const nw=projectPoint(west,north),se=projectPoint(east,south)
export const boroughBounds={minX:nw[0],minZ:nw[1],maxX:se[0],maxZ:se[1]}
export const boroughCourts=geography.courts.map(court=>{
 const p=court.points.slice(0,-1),x=p.reduce((s,v)=>s+v[0],0)/p.length,z=p.reduce((s,v)=>s+v[1],0)/p.length
 const edges=p.map((a,i)=>{const b=p[(i+1)%p.length];return {dx:b[0]-a[0],dz:b[1]-a[1],length:Math.hypot(b[0]-a[0],b[1]-a[1])}})
 const long=edges.reduce((a,b)=>a.length>b.length?a:b),short=edges.reduce((a,b)=>a.length<b.length?a:b)
 return {...court,x,z,width:short.length,depth:long.length,rotation:Math.atan2(long.dx,long.dz)}
})
/** Labels for the mapped courts no listed venue covers. Count and position come from the courts themselves. */
export const otherCourtPins=otherCourtSites.map(site=>{
 const courts=boroughCourts.filter(c=>site.courtIds.includes(c.id))
 return {...site,courts,x:courts.reduce((s,c)=>s+c.x,0)/courts.length,z:courts.reduce((s,c)=>s+c.z,0)/courts.length}
})
export type WatchableCourt={id:string;name:string;courts:number|null}
/** Every venue and named site, split by the real boundary rather than by hand. */
export function watchableCourts(venues:{id:string;name:string;lat:number;lng:number;courts:number|null}[]){
 const rows=[
  ...venues.map(v=>{const [x,z]=projectPoint(v.lng,v.lat);return {id:v.id,name:v.name,courts:v.courts,x,z}}),
  ...otherCourtPins.map(s=>({id:s.id,name:s.name,courts:s.courts.length as number|null,x:s.x,z:s.z})),
 ].sort((a,b)=>a.name.localeCompare(b.name))
 const inside=(r:{x:number;z:number})=>containsPoint(r.x,r.z,geography.boundary)
 const row=({id,name,courts}:WatchableCourt)=>({id,name,courts})
 return {islington:rows.filter(inside).map(row),nearby:rows.filter(r=>!inside(r)).map(row)}
}
/** Association only affects framing; it never substitutes operator court counts.
 * School/club/park venue pins may be published general locations rather than gates. */
export function courtsNearVenue(lat:number,lng:number){const [x,z]=projectPoint(lng,lat);return boroughCourts.filter(c=>Math.hypot(c.x-x,c.z-z)<22)}
/** Some source polygons include run-off (not just the white-line rectangle). */
export function boroughCourtDimensions(c:{width:number;depth:number}){
 const sourceW=c.width*10,sourceD=c.depth*10,enclosure=sourceW>13&&sourceD>28
 const w=enclosure?10.97:sourceW,d=enclosure?23.77:sourceD
 return {w,d,ow:enclosure?sourceW:w*1.45,od:enclosure?sourceD:d*1.32}
}
/** Footprint area in world units squared (1 unit = 10 m). */
export function footprintArea(points:number[][]){
 return Math.abs(points.slice(1).reduce((sum,b,i)=>sum+points[i][0]*b[1]-b[0]*points[i][1],0))/2
}
/** OSM records no height for most buildings. A shed-sized one must not take the terrace default. */
const HUT_AREA=.3,HUT_HEIGHT=.32
export function buildingHeight(tags:Record<string,string>={},points?:number[][]) {
 const height=Number.parseFloat(tags.height??''),levels=Number.parseFloat(tags['building:levels']??'')
 const unrecorded=points&&footprintArea(points)<HUT_AREA?HUT_HEIGHT:.95
 return Math.max(.22,Math.min(9,Number.isFinite(height)&&height>0?height*.1:Number.isFinite(levels)&&levels>0?levels*.3:['garage','garages','shed','outbuilding'].includes(tags.building)?.28:['industrial','warehouse','sports_centre'].includes(tags.building)?1:tags.building==='apartments'?1.5:unrecorded))
}
/** Phones keep the original budget; a desktop window is wide enough to need four more cells. */
export const detailCellLimit=(cssWidth:number)=>cssWidth>760?20:16
/** 3D detail appears only once the budget nearly fills the view, so it can never
 * sit on the flat overview as a hard-edged patch. Nearest cells win any remainder. */
export function detailCellsInView<T extends {x:number;z:number}>(visible:T[],target:{x:number;z:number},limit:number){
 if(visible.length>limit*1.25)return []
 return [...visible].sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)).slice(0,limit)
}
export function containsPoint(x:number,z:number,points:number[][]) {
 let inside=false
 for(let i=0,j=points.length-1;i<points.length;j=i++) {const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside}
 return inside
}
/** Longest wall provides a stable ridge axis without replacing a mapped footprint. */
export function roofBounds(points:number[][]){
 let angle=0,longest=0
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length>longest){longest=length;angle=-Math.atan2(b[1]-a[1],b[0]-a[0])}}
 const c=Math.cos(angle),s=Math.sin(angle),xs=points.map(([x,z])=>x*c-z*s),zs=points.map(([x,z])=>x*s+z*c)
 const l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...zs),b=Math.max(...zs)
 let result={x:(l+r)/2*c+(t+b)/2*s,z:-(l+r)/2*s+(t+b)/2*c,width:r-l,depth:b-t,angle}
 if(result.width>result.depth)result={...result,width:result.depth,depth:result.width,angle:result.angle+Math.PI/2}
 return result
}
