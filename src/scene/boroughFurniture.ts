import {boroughAmenities} from '../data/boroughAmenities.ts'
import {boroughRoadProfile} from './boroughStreetEdges.ts'
import {boroughCourts,containsPoint,type BoroughCell,type GeoFeature} from './boroughGeometry.ts'

const within=(x:number,z:number,f:GeoFeature)=>containsPoint(x,z,f.points)&&!f.holes?.some(h=>containsPoint(x,z,h))
function distanceToRoad(x:number,z:number,a:number[],b:number[]){const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz,t=length2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length2)):0;return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)}
/** Decorative seating, never a claim about surveyed or accessible benches. */
export function benchSites(data:BoroughCell){
 let attempts=0
 const sites:{x:number;z:number;heading:number;park:boolean}[]=[]
 const blocked=(x:number,z:number)=>[...data.buildings,...data.water,...boroughCourts].some(f=>within(x,z,f))||data.roads.some(r=>r.points.slice(1).some((b,i)=>distanceToRoad(x,z,r.points[i],b)<boroughRoadProfile(r.kind).width/2+.025))
 for(const road of [...data.roads].sort((a,b)=>Number(boroughRoadProfile(b.kind).walking)-Number(boroughRoadProfile(a.kind).walking))){
  if(road.kind==='steps')continue
  const profile=boroughRoadProfile(road.kind)
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)
   if(length<.8)continue
   for(let d=.5;d<length-.25;d+=2.4){
    if(++attempts>160)return sites
    const side=(sites.length%2)?-1:1,offset=profile.width/2+.105,x=a[0]+dx*d/length-dz/length*offset*side,z=a[1]+dz*d/length+dx/length*offset*side,heading=Math.atan2(dz*side,-dx*side),c=Math.cos(heading),s=Math.sin(heading)
    if(sites.some(p=>Math.hypot(p.x-x,p.z-z)<1.2)||data.trees.some(t=>Math.hypot(t.points[0][0]-x,t.points[0][1]-z)<.22))continue
    if([-1,1].some(u=>[-1,1].some(v=>blocked(x+c*u*.105+s*v*.045,z-s*u*.105+c*v*.045))))continue
    sites.push({x,z,heading,park:data.parks.some(p=>within(x,z,p))});if(sites.length===16)return sites
   }
  }
 }
 return sites
}
/** Illustrative avenue trees beside park walks; never a claim about surveyed trees. */
export function avenueTreeSites(data:BoroughCell,limit=36){
 const sites:{x:number;z:number}[]=[]
 if(!data.parks.length)return sites
 let attempts=0
 const crowded=(x:number,z:number)=>sites.some(p=>Math.hypot(p.x-x,p.z-z)<1.7)||data.trees.some(t=>Math.hypot(t.points[0][0]-x,t.points[0][1]-z)<.9)
 const blocked=(x:number,z:number)=>boroughCourts.some(c=>Math.hypot(c.x-x,c.z-z)<Math.max(c.width,c.depth))||[...data.buildings,...data.water].some(f=>within(x,z,f))||data.roads.some(r=>r.points.slice(1).some((b,i)=>distanceToRoad(x,z,r.points[i],b)<boroughRoadProfile(r.kind).width/2+.22))
 for(const road of data.roads){
  const profile=boroughRoadProfile(road.kind)
  if(!profile.walking||road.kind==='steps')continue
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)
   if(length<1.6)continue
   for(let d=.8,step=0;d<length-.5;d+=1.3,step++){
    const side=step%2?-1:1,offset=profile.width/2+.42,x=a[0]+dx*d/length-dz/length*offset*side,z=a[1]+dz*d/length+dx/length*offset*side
    if(!data.parks.some(p=>within(x,z,p))||crowded(x,z))continue
    if(++attempts>220)return sites
    if(blocked(x,z))continue
    sites.push({x,z});if(sites.length===limit)return sites
   }
  }
 }
 return sites
}
export function busStopSites(data:BoroughCell,cellId?:string){
 if(!cellId)return []
 return boroughAmenities.busStops.filter(stop=>stop.cell===cellId).map(stop=>({...stop,x:(stop.lng+.115)*6900,z:-(stop.lat-51.549)*11100})).filter(p=>![...data.buildings,...data.water,...boroughCourts].some(f=>within(p.x,p.z,f))&&data.roads.every(r=>boroughRoadProfile(r.kind).walking||r.points.slice(1).every((b,i)=>distanceToRoad(p.x,p.z,r.points[i],b)>boroughRoadProfile(r.kind).width/2+.025))).slice(0,12)
}
