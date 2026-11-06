import type {GeoFeature} from './boroughGeometry.ts'
import type {LifeRoute} from './boroughLifePaths.ts'

/** Join exact consecutive vertices of one recorded way. Never bridge a gap,
 * branch into another road, or smooth through an obstacle. Missing direction
 * restrictions remain an explicit source-data limitation. */
export function connectRoadRun(seed:LifeRoute,roads:GeoFeature[],clear:(x:number,z:number,r:number)=>boolean):LifeRoute {
 if(!seed.sourceId)return seed
 const edges=roads.filter(f=>String(f.id).split(':')[0]===seed.sourceId).flatMap(f=>f.points.slice(1).map((b,i)=>({a:f.points[i],b})))
 const mid=[(seed.a[0]+seed.b[0])/2,(seed.a[1]+seed.b[1])/2]
 const distance=(a:number[],b:number[])=>Math.hypot(a[0]-b[0],a[1]-b[1])
 const on=(a:number[],b:number[])=>{const length=distance(a,b),t=Math.max(0,Math.min(1,((mid[0]-a[0])*(b[0]-a[0])+(mid[1]-a[1])*(b[1]-a[1]))/(length*length||1)));return distance(mid,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t])<.01}
 const index=edges.findIndex(e=>on(e.a,e.b));if(index<0)return seed
 const used=new Set([index]),points=[seed.a,seed.b]
 const clearLink=(a:number[],b:number[])=>{const steps=Math.max(1,Math.ceil(distance(a,b)/.15));for(let j=0;j<=steps;j++)if(!clear(a[0]+(b[0]-a[0])*j/steps,a[1]+(b[1]-a[1])*j/steps,.28))return false;return true}
 for(const forward of [true,false]){
  let endpoint=forward?edges[index].b:edges[index].a
  const current=forward?points.at(-1)!:points[0]
  if(!clearLink(current,endpoint))continue
  if(distance(current,endpoint)>.0001){if(forward)points.push(endpoint);else points.unshift(endpoint)}
  for(let step=0;step<40;step++){
   const matches=edges.map((edge,i)=>({edge,i})).filter(({edge,i})=>!used.has(i)&&distance(forward?edge.a:edge.b,endpoint)<.0001)
   if(matches.length!==1)break
   const {edge,i}=matches[0],next=forward?edge.b:edge.a;if(points.some(p=>distance(p,next)<.0001)||!clearLink(endpoint,next))break
   if(forward)points.push(next);else points.unshift(next);used.add(i);endpoint=next
  }
 }
 if(points.length<3)return seed
 const rounded:number[][]=[points[0]]
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],before=distance(a,b),after=distance(b,c),cut=Math.min(.4,seed.width*.5,before*.3,after*.3)
  if(before<1e-6||after<1e-6)continue
  const start=b.map((v,k)=>v+(a[k]-v)*cut/before),end=b.map((v,k)=>v+(c[k]-v)*cut/after)
  rounded.push(start);for(let j=1;j<=8;j++){const t=j/8;rounded.push(start.map((v,k)=>(1-t)*(1-t)*v+2*(1-t)*t*b[k]+t*t*end[k]))}
 }
 rounded.push(points.at(-1)!)
 // Trim only the two outer ends; internal road vertices stay connected.
 for(const forward of [true,false]){let remaining=.4;while(remaining>0&&rounded.length>2){const end=forward?0:rounded.length-1,neighbor=forward?1:end-1,p=rounded[end],q=rounded[neighbor],length=distance(p,q);if(length<=remaining){remaining-=length;if(forward)rounded.shift();else rounded.pop()}else{rounded[end]=p.map((v,k)=>v+(q[k]-v)*remaining/length);remaining=0}}}
 if(rounded.some(([x,z])=>!clear(x,z,.3)))return seed
 const distances=[0];for(let i=1;i<rounded.length;i++)distances.push(distances[i-1]+distance(rounded[i-1],rounded[i]))
 if(distances.at(-1)!<seed.length+.5)return seed
 return {...seed,a:rounded[0],b:rounded.at(-1)!,points:rounded,distances,length:distances.at(-1)!}
}
export function sampleRoadRun(path:LifeRoute,distance:number){
 const points=path.points??[path.a,path.b],distances=path.distances??[0,path.length]
 const at=(d:number)=>{d=Math.max(0,Math.min(path.length,d));let lo=1,hi=distances.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(distances[mid]<d)lo=mid+1;else hi=mid}const i=lo,a=points[i-1],b=points[i],t=(d-distances[i-1])/(distances[i]-distances[i-1]||1);return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t}}
 const point=at(distance),before=at(distance-.08),after=at(distance+.08),length=Math.hypot(after.x-before.x,after.z-before.z)||1
 return {...point,dx:(after.x-before.x)/length,dz:(after.z-before.z)/length}
}
