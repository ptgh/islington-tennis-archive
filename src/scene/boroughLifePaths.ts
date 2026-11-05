import { boroughCourts, containsPoint, roofBounds, type BoroughCell, type GeoFeature } from './boroughGeometry.ts'
import { boroughRoadProfile } from './boroughStreetEdges.ts'

export type LifeRoute = { a: number[]; b: number[]; length: number; width: number; seed: number }
const hash=(id:string|number)=>{let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
export const inPolygon=(x:number,z:number,f:GeoFeature)=>containsPoint(x,z,f.points)&&!(f.holes??[]).some(h=>containsPoint(x,z,h))
const route=(a:number[],b:number[],width:number,seed:number):LifeRoute=>({a,b,width,seed,length:Math.hypot(b[0]-a[0],b[1]-a[1])})

/** Clip a source edge against the whole oriented boat hull (including margin). */
function hullCutsEdge(x:number,z:number,dx:number,dz:number,a:number[],b:number[],padding=0){
 const u=(p:number[])=>-(p[0]-x)*dz+(p[1]-z)*dx,v=(p:number[])=>(p[0]-x)*dx+(p[1]-z)*dz
 let lo=0,hi=1
 for(const [start,end,limit] of [[u(a),u(b),.12+padding],[v(a),v(b),.95+padding]]){
  const step=end-start
  if(Math.abs(step)<1e-10){if(Math.abs(start)>limit)return false;continue}
  const first=(-limit-start)/step,last=(limit-start)/step
  lo=Math.max(lo,Math.min(first,last));hi=Math.min(hi,Math.max(first,last));if(lo>hi)return false
 }
 return true
}

/** Local collision buckets keep construction bounded even in dense source cells. */
export function lifePaths(data:BoroughCell) {
 const grid=new Map<string,GeoFeature[]>(),size=2
 const obstacles=[...data.buildings,...data.water,...boroughCourts.map(c=>({id:c.id,points:c.points}))]
 for(const f of obstacles){
  const xs=f.points.map(p=>p[0]),zs=f.points.map(p=>p[1])
  for(let x=Math.floor(Math.min(...xs)/size);x<=Math.floor(Math.max(...xs)/size);x++)for(let z=Math.floor(Math.min(...zs)/size);z<=Math.floor(Math.max(...zs)/size);z++){
   const key=`${x},${z}`,list=grid.get(key)??[];list.push(f);grid.set(key,list)
  }
 }
 const waterFeatures=new Set(data.water)
 const clear=(x:number,z:number,r=.1)=>{
  for(const [dx,dz] of [[0,0],[-r,-r],[r,-r],[-r,r],[r,r]])for(const f of grid.get(`${Math.floor((x+dx)/size)},${Math.floor((z+dz)/size)}`)??[])if(inPolygon(x+dx,z+dz,f))return false
  return true
 }
 function safeRun(candidate:LifeRoute,radius:number,offset=0,inside?:(x:number,z:number)=>boolean):LifeRoute|null {
  const {a,b,length}=candidate;if(length<radius*4+.5)return null
  const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length,step=.15,n=Math.ceil(length/step)
  let start=-1,bestStart=0,bestEnd=0
  for(let i=0;i<=n;i++){
   const t=i/n,x=a[0]+dx*length*t-dz*offset,z=a[1]+dz*length*t+dx*offset
   const good=clear(x,z,radius)&&(!inside||inside(x,z))
   if(good&&start<0)start=i
   if((!good||i===n)&&start>=0){const end=good?i:i-1;if(end-start>bestEnd-bestStart){bestStart=start;bestEnd=end}start=-1}
  }
  const trim=radius+.08,from=bestStart/n*length+trim,to=bestEnd/n*length-trim
  if(to-from<.6)return null
  return route([a[0]+dx*from-dz*offset,a[1]+dz*from+dx*offset],[a[0]+dx*to-dz*offset,a[1]+dz*to+dx*offset],candidate.width,candidate.seed)
 }
 const roadSegments=data.roads.flatMap(f=>f.points.slice(1).map((b,i)=>({...route(f.points[i],b,boroughRoadProfile(f.kind).width,hash(f.id)),kind:f.kind??'',id:String(f.id).split(':')[0]}))).filter(r=>r.length>1)
 const select=(walking:boolean,limit:number)=>{
  const out:LifeRoute[]=[],seen=new Set<string>()
  const candidates=roadSegments.filter(r=>walking||(!boroughRoadProfile(r.kind).walking&&!['construction','proposed','motorway','motorway_link'].includes(r.kind))).sort((a,b)=>{
   const priority=(r:typeof a)=>walking?(boroughRoadProfile(r.kind).walking?100:0):(r.width>=.75?100:0)
   return priority(b)-priority(a)||b.length-a.length||a.seed-b.seed
  }).slice(0,100)
  for(const r of candidates){
   if(out.length===limit)break
   if(seen.has(r.id))continue
   const footway=boroughRoadProfile(r.kind).walking
   const safe=safeRun(r,walking?.055:.25,walking&&!footway?r.width/2+.07:0)
   if(!safe||safe.length<(walking?1:2.5))continue
   if(out.some(p=>Math.hypot((p.a[0]+p.b[0]-safe.a[0]-safe.b[0])/2,(p.a[1]+p.b[1]-safe.a[1]-safe.b[1])/2)<2))continue
   out.push(safe);seen.add(r.id)
  }
  return out
 }
 const cars=select(false,3),walkers=select(true,8)
 const train=data.railways.flatMap(f=>f.points.slice(1).map((b,i)=>route(f.points[i],b,.3,hash(f.id)))).sort((a,b)=>b.length-a.length).slice(0,20).map(r=>safeRun(r,.22)).find((r):r is LifeRoute=>!!r&&r.length>6)??null
 const transportGrid=new Map<string,{a:number[];b:number[];width:number;length:number}[]>()
 for(const f of data.water.length?[...data.roads,...data.railways]:[])for(let i=1;i<f.points.length;i++){
  const a=f.points[i-1],b=f.points[i],width=f.kind==='rail'?.3:boroughRoadProfile(f.kind).width,length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.001)continue
  for(let x=Math.floor((Math.min(a[0],b[0])-width)/size);x<=Math.floor((Math.max(a[0],b[0])+width)/size);x++)for(let z=Math.floor((Math.min(a[1],b[1])-width)/size);z<=Math.floor((Math.max(a[1],b[1])+width)/size);z++){
   const key=`${x},${z}`,list=transportGrid.get(key)??[];list.push({a,b,width,length});transportGrid.set(key,list)
  }
 }
 function hullIsClear(x:number,z:number,dx:number,dz:number,water:GeoFeature){
  const corners=[-1,1].flatMap(end=>[-1,1].map(side=>[x+dx*end*.95-dz*side*.12,z+dz*end*.95+dx*side*.12]))
  if(!corners.every(([px,pz])=>inPolygon(px,pz,water)))return false
  // A concave bank or an island can cut between corners; test every ring edge.
  for(const ring of [water.points,...water.holes??[]])for(let i=1;i<ring.length;i++)if(hullCutsEdge(x,z,dx,dz,ring[i-1],ring[i]))return false
  const rx=Math.abs(dx)*.95+Math.abs(dz)*.12,rz=Math.abs(dz)*.95+Math.abs(dx)*.12
  const seen=new Set<GeoFeature>(),crossings=new Set<{a:number[];b:number[];width:number;length:number}>()
  for(let bx=Math.floor((x-rx)/size);bx<=Math.floor((x+rx)/size);bx++)for(let bz=Math.floor((z-rz)/size);bz<=Math.floor((z+rz)/size);bz++){
   const key=`${bx},${bz}`
   for(const f of grid.get(key)??[])if(!waterFeatures.has(f))seen.add(f)
   for(const edge of transportGrid.get(key)??[])crossings.add(edge)
  }
  for(const f of seen){
   if(inPolygon(x,z,f))return false
   for(const ring of [f.points,...f.holes??[]])for(let i=1;i<ring.length;i++)if(hullCutsEdge(x,z,dx,dz,ring[i-1],ring[i]))return false
  }
  for(const edge of crossings)if(hullCutsEdge(x,z,dx,dz,edge.a,edge.b,edge.width/2+.045))return false
  return true
 }
 const waterRuns:LifeRoute[]=[]
 for(const f of data.water){
  const bounds=roofBounds(f.points),dx=Math.sin(bounds.angle),dz=Math.cos(bounds.angle),span=Math.hypot(bounds.depth,bounds.width)
  let best:LifeRoute|null=null
  // Search parallel interior chords, checking the full narrowboat footprint.
  for(const offset of [-.25,0,.25]){
   const x=bounds.x+Math.cos(bounds.angle)*bounds.width*offset,z=bounds.z-Math.sin(bounds.angle)*bounds.width*offset
   const sample=route([x-dx*span/2,z-dz*span/2],[x+dx*span/2,z+dz*span/2],.22,hash(f.id))
   const n=Math.ceil(span/.12);let start=-1
   for(let i=0;i<=n;i++){
    const t=i/n,px=sample.a[0]+dx*span*t,pz=sample.a[1]+dz*span*t
    const inside=hullIsClear(px,pz,dx,dz,f)
    if(inside&&start<0)start=i
    if((!inside||i===n)&&start>=0){const end=inside?i:i-1,a=[sample.a[0]+dx*span*start/n,sample.a[1]+dz*span*start/n],b=[sample.a[0]+dx*span*end/n,sample.a[1]+dz*span*end/n],found=route(a,b,.22,sample.seed);if(found.length>1&&(!best||found.length>best.length))best=found;start=-1}
   }
  }
  if(best)waterRuns.push(best)
 }
 const foxes:LifeRoute[]=[],birds:{x:number;z:number;radius:number;seed:number}[]=[]
 const besideRoad=(x:number,z:number)=>roadSegments.some(r=>{
  const dx=r.b[0]-r.a[0],dz=r.b[1]-r.a[1],t=Math.max(0,Math.min(1,((x-r.a[0])*dx+(z-r.a[1])*dz)/(r.length*r.length)))
  return Math.hypot(x-r.a[0]-dx*t,z-r.a[1]-dz*t)<r.width/2+.13
 })
 for(const park of data.parks.slice(0,60)){
  if(foxes.length&&birds.length>=2)break
  const bounds=roofBounds(park.points),seed=hash(park.id)
  for(let i=0;i<20;i++){
   const angle=(seed%628)/100+i*2.399,x=bounds.x+Math.cos(angle)*bounds.width*.24,z=bounds.z+Math.sin(angle)*bounds.depth*.24
   if(!inPolygon(x,z,park)||!clear(x,z,.2))continue
   if(!foxes.length&&!besideRoad(x,z)){
    const candidate=route([x-.8,z],[x+.8,z],.1,seed),safe=safeRun(candidate,.09,0,(px,pz)=>inPolygon(px,pz,park)&&!besideRoad(px,pz))
    if(safe)foxes.push(safe)
   }
   if(birds.length<2){
    const radius=Math.min(1.5,bounds.width*.2,bounds.depth*.2)
    if(radius>.3&&Array.from({length:16},(_,j)=>j*Math.PI/8).every(a=>inPolygon(x+Math.cos(a)*radius,z+Math.sin(a)*radius,park)&&clear(x+Math.cos(a)*radius,z+Math.sin(a)*radius,.1)))birds.push({x,z,radius,seed:seed+i})
   }
   if(foxes.length&&birds.length>=2)break
  }
 }
 return {cars,walkers,train,boats:waterRuns.slice(0,1),foxes,birds}
}

/** Smooth endpoint turns with a short stop; no shrinking, hiding or teleporting. */
export function lifePose(path:LifeRoute,time:number,speed:number,stop=0) {
 const travel=path.length/speed,half=travel+stop,cycle=((time+path.seed%100/20)%(half*2)+half*2)%(half*2)
 const forward=cycle<half,leg=cycle%half,t=Math.min(1,leg/travel),ease=t*t*(3-2*t),u=forward?ease:1-ease
 return {x:path.a[0]+(path.b[0]-path.a[0])*u,z:path.a[1]+(path.b[1]-path.a[1])*u,heading:Math.atan2(path.b[0]-path.a[0],path.b[1]-path.a[1])+(forward?0:Math.PI),stopped:t===1,amber:t>.88&&t<1,forward}
}
