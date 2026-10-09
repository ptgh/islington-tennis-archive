import geography from '../data/highbury-geography.json' with { type: 'json' };
import type { MapVenue } from './types.ts';
export const projectPoint=(lng:number,lat:number):[number,number]=>[(lng+.115)*6900,-(lat-51.549)*11100];
export const highburyGeography=geography;
export function inHighbury(x:number,z:number,margin=0){
 const [west,south,east,north]=geography.bbox;
 const a=projectPoint(west,north),b=projectPoint(east,south);
 return x>=a[0]-margin&&x<=b[0]+margin&&z>=a[1]-margin&&z<=b[1]+margin;
}
export const highburyCourts=geography.courts.map(court=>{
 const points=court.points.slice(0,-1).map(([lng,lat])=>projectPoint(lng,lat));
 const x=points.reduce((n,p)=>n+p[0],0)/points.length,z=points.reduce((n,p)=>n+p[1],0)/points.length;
 const edges=points.map((p,i)=>{const q=points[(i+1)%points.length];return {dx:q[0]-p[0],dz:q[1]-p[1],length:Math.hypot(q[0]-p[0],q[1]-p[1])};});
 const long=edges.reduce((a,b)=>a.length>b.length?a:b),short=edges.reduce((a,b)=>a.length<b.length?a:b);
 return {id:court.id,x,z,width:short.length,depth:long.length,rotation:Math.atan2(long.dx,long.dz)};
});
/** Cartographic display scale: the surveyed 3 + 4 + 2 + 2 arrangement stays legible
 * alongside the other miniature courts. Source measurements remain above. */
export const renderedHighburyCourts=highburyCourts.map(court=>({
 ...court,
 x:court.x<100?85+(court.x-95.5)*4.4:98+(court.x-110.1)*4.4,
 z:court.x<100?-62+(court.z+36.7)*4.4:-31+(court.z+28.2)*4.4,
 width:court.width*4.4,depth:court.depth*4.4,
}));
export type CourtArea={x:number;z:number;halfWidth:number;halfDepth:number;rotation:number};
/** Shared exclusion areas keep scenery, roads and vehicles out of playing enclosures. */
export function courtAreas(venues:MapVenue[]):CourtArea[]{return venues.flatMap(venue=>{
 if(venue.id==='highbury-fields')return renderedHighburyCourts.map(c=>({x:c.x,z:c.z,halfWidth:c.width*.75,halfDepth:c.depth*.68,rotation:c.rotation}));
 const [x,z]=projectPoint(venue.lng,venue.lat),centre=venue.id==='islington-tennis-centre';
 const count=centre?2:Math.max(1,Math.min(venue.courts||1,14)),columns=centre?1:count>5?3:count>1?2:1;
 return [{x:x+(centre?7:0),z,halfWidth:(columns*7.2+2.8)/2+2,halfDepth:(Math.ceil(count/columns)*13.2+2.8)/2+2,rotation:0}];
});}
export function inCourtArea(x:number,z:number,areas:CourtArea[],margin=0){return areas.some(a=>{
 const dx=x-a.x,dz=z-a.z,c=Math.cos(a.rotation),s=Math.sin(a.rotation);
 return Math.abs(dx*c-dz*s)<a.halfWidth+margin&&Math.abs(dx*s+dz*c)<a.halfDepth+margin;
});}
