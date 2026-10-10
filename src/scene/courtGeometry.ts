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
/** Enough clearance that a full-width bus road (5.8) passes a court without being cut. */
export const ROUTE_COURT_CLEARANCE=4.2;
/** Bend a polyline around court enclosures, hugging one side of each, so a road and
 * the buses on it share one path that never crosses (or vanishes at) a court. The
 * swing eases in and out over `ease` units before each enclosure, so it never clips a corner. */
export function routeAroundCourts(points:[number,number][],areas:CourtArea[],margin=ROUTE_COURT_CLEARANCE,ease=8):[number,number][]{
 const toLocal=(a:CourtArea,x:number,z:number)=>{const c=Math.cos(a.rotation),s=Math.sin(a.rotation),dx=x-a.x,dz=z-a.z;return [dx*c-dz*s,dx*s+dz*c];};
 const toWorld=(a:CourtArea,u:number,v:number):[number,number]=>{const c=Math.cos(a.rotation),s=Math.sin(a.rotation);return [a.x+u*c+v*s,a.z-u*s+v*c];};
 const out:[number,number][]=[];
 for(let i=1;i<points.length;i++){
  const [ax,az]=points[i-1],[bx,bz]=points[i],steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)));
  const samples=Array.from({length:steps},(_,k):[number,number]=>[ax+(bx-ax)*k/steps,az+(bz-az)*k/steps]);
  // Per enclosure: which local axis the segment runs along, and which side it passes.
  const plans=areas.map(a=>{
   const [u0,v0]=toLocal(a,ax,az),[u1,v1]=toLocal(a,bx,bz),alongU=Math.abs(u1-u0)>=Math.abs(v1-v0);
   const run=alongU?a.halfWidth+margin:a.halfDepth+margin,across=alongU?a.halfDepth+margin:a.halfWidth+margin;
   const local=samples.map(([x,z])=>{const [u,v]=toLocal(a,x,z);return alongU?[u,v]:[v,u];});
   const nearest=local.reduce((best,p)=>Math.abs(p[0])<Math.abs(best[0])?p:best,local[0]);
   const hit=local.some(([r,q])=>Math.abs(q)<across&&Math.abs(r)<run+ease);
   return {a,alongU,run,across,side:nearest[1]<0?-1:1,hit};
  }).filter(plan=>plan.hit);
  if(!plans.length){out.push(points[i-1]);continue;}
  for(const [sx,sz] of samples){
   let x=sx,z=sz;
   for(const {a,alongU,run,across,side} of plans){
    const [u,v]=toLocal(a,x,z),r=alongU?u:v,q=alongU?v:u;
    if(Math.abs(q)>=across)continue;
    const t=Math.abs(r)<=run?1:Math.abs(r)>=run+ease?0:1-(Math.abs(r)-run)/ease;
    const w=t*t*(3-2*t),moved=q+(side*across-q)*w;
    [x,z]=alongU?toWorld(a,u,moved):toWorld(a,moved,v);
   }
   out.push([x,z]);
  }
 }
 if(points.length)out.push(points[points.length-1]);
 return out;
}
/** The illustrated Highbury Fields. It is drawn far larger than life, so the streets that
 * really bound it (Highbury Grove, Highbury Place, Highbury Corner) fall inside it on the map. */
export const HIGHBURY_PARK=(()=>{const [x,z]=projectPoint(-.099,51.5525);return {x,z,rx:46,rz:68};})();
/** Bus roads skirt the park beyond its perimeter walk (walk edge ~1.9, road half-width 2.9). */
export const PARK_ROAD_CLEARANCE=5.2;
/** Replace every stretch of a polyline inside the park with the shorter arc around its edge. */
export function routeAroundPark(points:[number,number][],park:{x:number;z:number;rx:number;rz:number}=HIGHBURY_PARK,margin=PARK_ROAD_CLEARANCE):[number,number][]{
 const rx=park.rx+margin,rz=park.rz+margin;
 const inside=([x,z]:[number,number])=>((x-park.x)/rx)**2+((z-park.z)/rz)**2<1;
 const angle=([x,z]:[number,number])=>Math.atan2((z-park.z)/rz,(x-park.x)/rx);
 const onEdge=(t:number):[number,number]=>[park.x+Math.cos(t)*rx,park.z+Math.sin(t)*rz];
 const dense:[number,number][]=[];
 for(let i=1;i<points.length;i++){const [ax,az]=points[i-1],[bx,bz]=points[i],n=Math.max(1,Math.ceil(Math.hypot(bx-ax,bz-az)));for(let k=0;k<n;k++)dense.push([ax+(bx-ax)*k/n,az+(bz-az)*k/n]);}
 if(points.length)dense.push(points[points.length-1]);
 if(!dense.some(inside))return points;
 const out:[number,number][]=[];
 for(let i=0;i<dense.length;){
  if(!inside(dense[i])){out.push(dense[i]);i++;continue;}
  let j=i;while(j<dense.length&&inside(dense[j]))j++;
  if(i===0||j===dense.length){for(let k=i;k<j;k++)out.push(onEdge(angle(dense[k])));i=j;continue;}
  const from=angle(dense[i-1]),to=angle(dense[j]);
  const sweep=Math.atan2(Math.sin(to-from),Math.cos(to-from)),steps=Math.max(2,Math.ceil(Math.abs(sweep)*(rx+rz)/2));
  for(let k=1;k<steps;k++)out.push(onEdge(from+sweep*k/steps));
  i=j;
 }
 return out;
}
/** The one line a bus route follows: around Highbury Fields, then around court enclosures.
 * Roads, buses and the stringer van all use it, so they can never disagree. */
export function busRouteLine(points:[number,number][],areas:CourtArea[]):[number,number][]{
 return routeAroundCourts(routeAroundPark(points),areas);
}
