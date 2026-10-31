import geography from '../data/islington-geography.json' with { type: 'json' }
import { projectPoint } from './courtGeometry.ts'

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
/** Association only affects framing; it never substitutes operator court counts.
 * School/club/park venue pins may be published general locations rather than gates. */
export function courtsNearVenue(lat:number,lng:number){const [x,z]=projectPoint(lng,lat);return boroughCourts.filter(c=>Math.hypot(c.x-x,c.z-z)<22)}
export function buildingHeight(tags:Record<string,string>={}) {
 const height=Number.parseFloat(tags.height??''),levels=Number.parseFloat(tags['building:levels']??'')
 return Math.max(.22,Math.min(9,Number.isFinite(height)&&height>0?height*.1:Number.isFinite(levels)&&levels>0?levels*.3:['garage','garages','shed','outbuilding'].includes(tags.building)?.28:['industrial','warehouse','sports_centre'].includes(tags.building)?1:tags.building==='apartments'?1.5:.95))
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
