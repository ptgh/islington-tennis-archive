import type { CourtArea } from './courtGeometry.ts'

type Point = [number, number]
export type StreetSegment = { a: readonly number[]; b: readonly number[]; width: number }
export type StreetCorner = {corner:Point;center:Point;radius:number;arc:Point[]}
type Block = { left: number; right: number; top: number; bottom: number }
export type StreetPark = {x:number;z:number;rx:number;rz:number}
const epsilon = .04
const inside = ([x,z]: Point, b: Block) => x>b.left && x<b.right && z>b.top && z<b.bottom

/** Feather the existing narrow Highbury pavements into the wider town finish,
 * instead of stepping sideways at a rectangular neighbourhood boundary. */
export function streetPavementWidth(x:number,z:number,road:{bus?:boolean;surveyed?:boolean}={}){
 if(road.surveyed)return .16
 if(road.bus)return 1.2
 const margin=Math.min(50-Math.abs(x-109),82-Math.abs(z+32)),t=Math.max(0,Math.min(1,margin/8))
 return 1.2-1.04*t*t*(3-2*t)
}

/** Retained avenue walks meet the park's perimeter, including source road ends
 * that used to leave a square stub in the lawn. Shallow grazes are omitted. */
export function parkAvenuePaths(source:Point[],park:StreetPark,areas:CourtArea[]=[]):Point[][]{
 const points=source.filter((p,i)=>!i||Math.hypot(p[0]-source[i-1][0],p[1]-source[i-1][1])>1e-6).map(p=>[...p] as Point)
 if(points.length<2||park.rx<=0||park.rz<=0)return []
 const local=(p:Point):Point=>[(p[0]-park.x)/park.rx,(p[1]-park.z)/park.rz]
 const roots=(a:Point,b:Point)=>{
  const p=local(a),q=local(b),dx=q[0]-p[0],dz=q[1]-p[1],aa=dx*dx+dz*dz,bb=2*(p[0]*dx+p[1]*dz),cc=p[0]*p[0]+p[1]*p[1]-1
  const discriminant=bb*bb-4*aa*cc
  return aa<1e-12||discriminant<0?null:[(-bb-Math.sqrt(discriminant))/(2*aa),(-bb+Math.sqrt(discriminant))/(2*aa)]
 }
 for(const [index,neighbor] of [[0,1],[points.length-1,points.length-2]]){
  const a=points[index],p=local(a)
  if(p[0]*p[0]+p[1]*p[1]>=1)continue
  const beyond:Point=[2*a[0]-points[neighbor][0],2*a[1]-points[neighbor][1]],hits=roots(a,beyond)
  if(hits){const t=hits[1];points[index]=[a[0]+(beyond[0]-a[0])*t,a[1]+(beyond[1]-a[1])*t]}
 }
 const paths:Point[][]=[]
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],hits=roots(a,b)
  if(!hits)continue
  const lo=Math.max(0,hits[0]),hi=Math.min(1,hits[1]);if(hi-lo<1e-6)continue
  const at=(t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],start=at(lo),end=at(hi),last=paths.at(-1)
  if(last&&Math.hypot(last.at(-1)![0]-start[0],last.at(-1)![1]-start[1])<1e-5)last.push(end)
  else paths.push([start,end])
 }
 return paths.filter(path=>path.slice(1).some((b,i)=>{
  const a=local(path[i]),q=local(b),dx=q[0]-a[0],dz=q[1]-a[1],t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dz)/(dx*dx+dz*dz||1)))
  return Math.hypot(a[0]+t*dx,a[1]+t*dz)<.9
 })).map(path=>routeStreetAroundCourts(path,areas,1.7))
}

/** Space paint by travelled distance, independent of polyline sampling density.
 * Straight pieces coalesce, while a painted dash can follow a bend. */
export function streetDashPieces(points:Point[],dashLength=2,gapLength=4):[Point,Point][]{
 if(dashLength<=0||gapLength<=0)return []
 const pieces:[Point,Point][]=[]
 let painted=true,remaining=dashLength
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)
  if(length<1e-8)continue
  let along=0
  while(along<length-1e-8){
   const step=Math.min(remaining,length-along)
   if(painted){
    const start:Point=[a[0]+dx*along/length,a[1]+dz*along/length],end:Point=[a[0]+dx*(along+step)/length,a[1]+dz*(along+step)/length]
    const previous=pieces.at(-1),px=previous?previous[1][0]-previous[0][0]:0,pz=previous?previous[1][1]-previous[0][1]:0
    if(previous&&Math.hypot(previous[1][0]-start[0],previous[1][1]-start[1])<1e-6&&Math.abs(px*dz-pz*dx)<1e-6&&px*dx+pz*dz>0)previous[1]=end
    else pieces.push([start,end])
   }
   along+=step;remaining-=step
   if(remaining<1e-8){painted=!painted;remaining=painted?dashLength:gapLength}
  }
 }
 return pieces
}

/** Bounded bevels close the triangular gaps between two road strips at a bend. */
export function streetBendTriangles(a:Point,b:Point,c:Point,width:number):[Point,Point,Point][]{
 const first=Math.hypot(b[0]-a[0],b[1]-a[1]),last=Math.hypot(c[0]-b[0],c[1]-b[1])
 if(first<.01||last<.01||width<=0)return []
 const ux=(b[0]-a[0])/first,uz=(b[1]-a[1])/first,vx=(c[0]-b[0])/last,vz=(c[1]-b[1])/last
 if(Math.abs(ux*vz-uz*vx)<.005)return []
 return [-1,1].map(side=>{
  const p:Point=[b[0]-uz*width*.5*side,b[1]+ux*width*.5*side],q:Point=[b[0]-vz*width*.5*side,b[1]+vx*width*.5*side]
  return (p[0]-b[0])*(q[1]-b[1])-(p[1]-b[1])*(q[0]-b[0])>0?[b,q,p]:[b,p,q]
 })
}

/** Small tangent arcs soften the islands between finite crossing road strips.
 * This adds surface detail only; neither source line nor road width changes. */
export function streetCornerFillets(first:StreetSegment,second:StreetSegment,radius=2.4){
 const length=(s:StreetSegment)=>Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1])
 const l1=length(first),l2=length(second)
 if(l1<1||l2<1||first.width<=0||second.width<=0||radius<=0)return []
 const u:Point=[(first.b[0]-first.a[0])/l1,(first.b[1]-first.a[1])/l1],v:Point=[(second.b[0]-second.a[0])/l2,(second.b[1]-second.a[1])/l2]
 const cross=(a:Point,b:Point)=>a[0]*b[1]-a[1]*b[0],det=cross(u,v)
 if(Math.abs(det)<.06)return [] // Shared and almost parallel roadbeds need no corner patch.
 const gap:Point=[second.a[0]-first.a[0],second.a[1]-first.a[1]],along1=cross(gap,v)/det
 const origin:Point=[first.a[0]+u[0]*along1,first.a[1]+u[1]*along1]
 const fillets:StreetCorner[]=[]
 for(const s1 of [-1,1])for(const s2 of [-1,1]){
  const n1:Point=[-u[1]*s1,u[0]*s1],n2:Point=[-v[1]*s2,v[0]*s2],d=cross(n1,n2),dot=n1[0]*n2[0]+n1[1]*n2[1]
  const h1=first.width/2,h2=second.width/2
  const corner:Point=[origin[0]+(h1*n2[1]-n1[1]*h2)/d,origin[1]+(n1[0]*h2-h1*n2[0])/d]
  const along=(p:Point,s:StreetSegment,direction:Point)=>(p[0]-s.a[0])*direction[0]+(p[1]-s.a[1])*direction[1]
  const q1=along(corner,first,u),q2=along(corner,second,v)
  if(q1<0||q1>l1||q2<0||q2>l2)continue
  const unitCenter:Point=[(n1[0]+n2[0])/(1+dot),(n1[1]+n2[1])/(1+dot)]
  const shift1=(unitCenter[0]-n1[0])*u[0]+(unitCenter[1]-n1[1])*u[1],shift2=(unitCenter[0]-n2[0])*v[0]+(unitCenter[1]-n2[1])*v[1]
  const fit=(at:number,span:number,shift:number)=>Math.abs(shift)<1e-9?Infinity:(shift>0?span-at:at)/Math.abs(shift)
  // Short meeting edges get a smaller curve, rather than losing the corner.
  // Leave a tiny tolerance at finite ends; never extend a road to fit an arc.
  const r=Math.min(radius,4/Math.sqrt((1-dot)/(1+dot)),fit(q1,l1,shift1)*.999999,fit(q2,l2,shift2)*.999999)
  if(r<.15)continue
  const center:Point=[corner[0]+(n1[0]+n2[0])*r/(1+dot),corner[1]+(n1[1]+n2[1])*r/(1+dot)]
  const t1:Point=[center[0]-n1[0]*r,center[1]-n1[1]*r],t2:Point=[center[0]-n2[0]*r,center[1]-n2[1]*r]
  if(along(t1,first,u)<0||along(t1,first,u)>l1||along(t2,second,v)<0||along(t2,second,v)>l2)continue
  const start=Math.atan2(-n1[1],-n1[0]),end=Math.atan2(-n2[1],-n2[0]),sweep=Math.atan2(Math.sin(end-start),Math.cos(end-start)),steps=Math.ceil(Math.abs(sweep)/(Math.PI/18))
  const arc=Array.from({length:steps+1},(_,i):Point=>{
   const angle=start+sweep*i/steps
   return [center[0]+Math.cos(angle)*r,center[1]+Math.sin(angle)*r]
  })
  fillets.push({corner,center,radius:r,arc})
 }
 return fillets
}

/** Keep the paving concentric with its kerb, even where a narrow pavement
 * meets a wider one. Tiny island tips close at the centre rather than invert. */
export function streetCornerBorder(fillet:StreetCorner,firstWidth:number,secondWidth:number){
 return {corner:fillet.corner,arc:fillet.arc.map((p,i):Point=>{
  const width=firstWidth+(secondWidth-firstWidth)*i/(fillet.arc.length-1),scale=Math.max(0,fillet.radius-width)/fillet.radius
  return [fillet.center[0]+(p[0]-fillet.center[0])*scale,fillet.center[1]+(p[1]-fillet.center[1])*scale]
 })}
}

/** Trim decoration against the added junction surfaces too. Close crossings
 * can overlap corner patches even when their original road strips do not. */
export function streetCornerEdgeClipper(corners:StreetCorner[]){
 const patches=corners.map(corner=>{
  const polygon=[corner.corner,...corner.arc]
  return {corner,polygon,left:Math.min(...polygon.map(p=>p[0])),right:Math.max(...polygon.map(p=>p[0])),top:Math.min(...polygon.map(p=>p[1])),bottom:Math.max(...polygon.map(p=>p[1]))}
 })
 return (a:Point,b:Point,except?:StreetCorner):[Point,Point][]=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],span=Math.hypot(dx,dz)
  if(span<.05)return []
  let visible:[number,number][]=[[0,1]]
  for(const {corner,polygon,left,right,top,bottom} of patches){
   if(corner===except||Math.max(a[0],b[0])<left||Math.min(a[0],b[0])>right||Math.max(a[1],b[1])<top||Math.min(a[1],b[1])>bottom)continue
   const cuts=[0,1]
   for(let i=0;i<polygon.length;i++){
    const p=polygon[i],q=polygon[(i+1)%polygon.length],ex=q[0]-p[0],ez=q[1]-p[1],det=dx*ez-dz*ex
    if(Math.abs(det)<1e-9)continue
    const t=((p[0]-a[0])*ez-(p[1]-a[1])*ex)/det,s=((p[0]-a[0])*dz-(p[1]-a[1])*dx)/det
    if(t>0&&t<1&&s>=0&&s<=1)cuts.push(t)
   }
   cuts.sort((x,y)=>x-y)
   const outside:[number,number][]=[]
   for(let i=1;i<cuts.length;i++){
    const t=(cuts[i-1]+cuts[i])/2,x=a[0]+t*dx,z=a[1]+t*dz
    let inside=false
    for(let j=0;j<polygon.length;j++){
     const p=polygon[j],q=polygon[(j+1)%polygon.length]
     if((p[1]>z)!==(q[1]>z)&&x<(q[0]-p[0])*(z-p[1])/(q[1]-p[1])+p[0])inside=!inside
    }
    if(!inside)outside.push([cuts[i-1],cuts[i]])
   }
   visible=visible.flatMap(([lo,hi])=>outside.map(([start,end]):[number,number]=>[Math.max(lo,start),Math.min(hi,end)]).filter(([start,end])=>end>start))
   if(!visible.length)break
  }
  const point=(t:number):Point=>[a[0]+t*dx,a[1]+t*dz]
  return visible.filter(([lo,hi])=>(hi-lo)*span>.08).map(([lo,hi])=>[point(lo),point(hi)])
 }
}

/** Remove metre-spaced collinear samples without turning park arcs into corners. */
function simplifyStreet(points:Point[],tolerance=.3):Point[]{
 if(points.length<3)return points
 const keep=new Set([0,points.length-1]),pending=[[0,points.length-1]]
 while(pending.length){
  const [start,end]=pending.pop()!,a=points[start],b=points[end],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz
  let furthest=-1,distance=tolerance*tolerance
  for(let i=start+1;i<end;i++){
   const p=points[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length)):0
   const d=(p[0]-a[0]-dx*t)**2+(p[1]-a[1]-dz*t)**2
   if(d>distance){distance=d;furthest=i}
  }
  if(furthest>=0){keep.add(furthest);pending.push([start,furthest],[furthest,end])}
 }
 return points.filter((_,i)=>keep.has(i))
}

// Cache visibility between shared boundary nodes across the streets of one
// world. Weak keys release the graph when that world's scenery is disposed.
const parkRouters=new WeakMap<StreetPark[],WeakMap<CourtArea[],Map<number,(points:Point[])=>Point[]>>>()

/** Treat parks and courts as one set of obstacles. Separate detours can bounce
 * between overlapping compounds, leaving the very stubs this planner avoids. */
export function routeStreetAroundParks(points:Point[],parks:StreetPark[],areas:CourtArea[],width:number):Point[]{
 if(!parkRouters.has(parks))parkRouters.set(parks,new WeakMap())
 const byArea=parkRouters.get(parks)!
 if(!byArea.has(areas))byArea.set(areas,new Map())
 const byWidth=byArea.get(areas)!
 if(!byWidth.has(width))byWidth.set(width,parkStreetRouter(parks,areas,width))
 return byWidth.get(width)!(points)
}

function parkStreetRouter(parks:StreetPark[],areas:CourtArea[],width:number){
 const blocks:Block[]=areas.map(a=>{
  const c=Math.abs(Math.cos(a.rotation)),s=Math.abs(Math.sin(a.rotation)),margin=width/2+1.5
  const x=(a.halfWidth+margin)*c+(a.halfDepth+margin)*s,z=(a.halfWidth+margin)*s+(a.halfDepth+margin)*c
  return {left:a.x-x,right:a.x+x,top:a.z-z,bottom:a.z+z}
 })
 const ellipses=parks.map(p=>({...p,rx:p.rx+6.5,rz:p.rz+6.5}))
 const blocked=(p:Point)=>blocks.some(b=>inside(p,b))||ellipses.some(b=>((p[0]-b.x)/b.rx)**2+((p[1]-b.z)/b.rz)**2<1)
 const clear=(a:Point,b:Point)=>{
  for(const e of ellipses){
   if(Math.max(a[0],b[0])<e.x-e.rx||Math.min(a[0],b[0])>e.x+e.rx||Math.max(a[1],b[1])<e.z-e.rz||Math.min(a[1],b[1])>e.z+e.rz)continue
   const x=(a[0]-e.x)/e.rx,z=(a[1]-e.z)/e.rz,dx=(b[0]-a[0])/e.rx,dz=(b[1]-a[1])/e.rz
   const t=Math.max(0,Math.min(1,-(x*dx+z*dz)/(dx*dx+dz*dz||1)))
   if((x+t*dx)**2+(z+t*dz)**2<1)return false
  }
  for(const r of blocks){
   let enter=0,exit=1,hit=true
   for(const [start,end,low,high] of [[a[0],b[0],r.left,r.right],[a[1],b[1],r.top,r.bottom]]){
    const d=end-start
    if(Math.abs(d)<1e-9){if(start<=low||start>=high){hit=false;break};continue}
    const t0=(low-start)/d,t1=(high-start)/d
    enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1))
    if(enter>=exit){hit=false;break}
   }
   if(hit)return false
  }
  return true
 }
 const boundary:Point[]=[...parks.flatMap(p=>Array.from({length:32},(_,i):Point=>{
  const angle=i*Math.PI/16;return [p.x+Math.cos(angle)*(p.rx+8),p.z+Math.sin(angle)*(p.rz+8)]
 })),...blocks.flatMap(b=>[[b.left-epsilon,b.top-epsilon],[b.left-epsilon,b.bottom+epsilon],[b.right+epsilon,b.top-epsilon],[b.right+epsilon,b.bottom+epsilon]] as Point[])].filter(p=>!blocked(p))
 const adjacency=new Map<number,{index:number;distance:number}[]>()
 const neighbours=(index:number)=>{
  if(!adjacency.has(index))adjacency.set(index,boundary.flatMap((p,j)=>j!==index&&clear(boundary[index],p)?[{index:j,distance:Math.hypot(p[0]-boundary[index][0],p[1]-boundary[index][1])}]:[]))
  return adjacency.get(index)!
 }
 const endpoint=(p:Point):Point=>blocked(p)?boundary.reduce((best,q)=>Math.hypot(q[0]-p[0],q[1]-p[1])<Math.hypot(best[0]-p[0],best[1]-p[1])?q:best):p
 return (source:Point[]):Point[]=>{
  if(source.length<2)return source
  const points=[endpoint(source[0]),...source.slice(1,-1).filter(p=>!blocked(p)),endpoint(source[source.length-1])],out:Point[]=[points[0]]
  for(let section=1;section<points.length;section++){
   const a=points[section-1],b=points[section]
   if(clear(a,b)){out.push(b);continue}
   const nodes=[a,b,...boundary],cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set<number>();cost[0]=0
   const heuristic=(i:number)=>Math.hypot(nodes[i][0]-b[0],nodes[i][1]-b[1])
   for(let step=0;step<nodes.length;step++){
    let best=-1
    for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(best<0||cost[i]+heuristic(i)<cost[best]+heuristic(best)))best=i
    if(best<0||!Number.isFinite(cost[best])||best===1)break
    visited.add(best)
    const edges=best===0?boundary.flatMap((p,i)=>clear(a,p)?[{index:i+2,distance:Math.hypot(a[0]-p[0],a[1]-p[1])}]:[]):neighbours(best-2).map(e=>({...e,index:e.index+2}))
    if(best!==0&&clear(nodes[best],b))edges.push({index:1,distance:heuristic(best)})
    for(const edge of edges)if(!visited.has(edge.index)&&cost[best]+edge.distance<cost[edge.index]){cost[edge.index]=cost[best]+edge.distance;previous[edge.index]=best}
   }
   if(previous[1]<0)throw new Error('No continuous street route around park and court compounds')
   const path:Point[]=[];for(let i=1;i>0;i=previous[i])path.push(nodes[i]);out.push(...path.reverse())
  }
  return simplifyStreet(out,.1)
 }
}

/** Draw a continuation from a finite road end to a nearby street.
 * This changes scenery only: the published route and vehicle path stay intact. */
export function streetEndConnections(points:Point[],others:StreetSegment[],areas:CourtArea[],width:number,maxDistance=100,parks?:StreetPark[]):Point[][]{
 if(points.length<2)return []
 const links:Point[][]=[]
 for(const [end,insidePoint] of [[points[0],points[1]],[points[points.length-1],points[points.length-2]]]){
  const candidates:{point:Point;distance:number}[]=[]
  let joined=false
  for(const {a,b,width:otherWidth} of others){
   const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz
   if(length<1e-8)continue
   const t=Math.max(0,Math.min(1,((end[0]-a[0])*dx+(end[1]-a[1])*dz)/length))
   const p:Point=[a[0]+t*dx,a[1]+t*dz],distance=Math.hypot(p[0]-end[0],p[1]-end[1])
   if(distance<(width+otherWidth)/2-.2){joined=true;break}
   if(distance<maxDistance)candidates.push({point:p,distance})
  }
  if(joined)continue
  for(const {point} of candidates.sort((a,b)=>a.distance-b.distance)){
   const link=parks?routeStreetAroundParks([end,point],parks,areas,width):routeStreetAroundCourts([end,point],areas,width)
   if(link.length<2||Math.hypot(link[0][0]-end[0],link[0][1]-end[1])>.01||Math.hypot(link.at(-1)![0]-point[0],link.at(-1)![1]-point[1])>.01)continue
   const dx=link[1][0]-end[0],dz=link[1][1]-end[1],ox=end[0]-insidePoint[0],oz=end[1]-insidePoint[1]
   if(dx*ox+dz*oz<-.92*Math.hypot(dx,dz)*Math.hypot(ox,oz))continue
   links.push(link);break
  }
 }
 return links
}

/** Continuous illustrative streets around court compounds, instead of clipped stubs.
 * Expanded, merged bounds leave room for both pavements even at rotated courts.
 * Bus roads retain their separate, shared busRouteLine.
 */
export function routeStreetAroundCourts(points: Point[], areas: CourtArea[], width: number): Point[] {
  const margin=width/2+1.5
  const blocks: Block[]=areas.map(a=>{
    const c=Math.abs(Math.cos(a.rotation)),s=Math.abs(Math.sin(a.rotation))
    const x=(a.halfWidth+margin)*c+(a.halfDepth+margin)*s,z=(a.halfWidth+margin)*s+(a.halfDepth+margin)*c
    return {left:a.x-x,right:a.x+x,top:a.z-z,bottom:a.z+z}
  })
  for(let i=0;i<blocks.length;i++)for(let j=i+1;j<blocks.length;j++){
    const a=blocks[i],b=blocks[j]
    if(a.left<=b.right&&a.right>=b.left&&a.top<=b.bottom&&a.bottom>=b.top){
      blocks[i]={left:Math.min(a.left,b.left),right:Math.max(a.right,b.right),top:Math.min(a.top,b.top),bottom:Math.max(a.bottom,b.bottom)}
      blocks.splice(j,1);i=-1;break
    }
  }
  const moveEndpoint=(p:Point):Point=>{
    for(const b of blocks)if(inside(p,b)){
      const exits:Point[]=[[b.left-epsilon,p[1]],[b.right+epsilon,p[1]],[p[0],b.top-epsilon],[p[0],b.bottom+epsilon]]
      return exits.sort((a,c)=>Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(c[0]-p[0],c[1]-p[1]))[0]
    }
    return p
  }
  const clear=(a:Point,b:Point)=>!blocks.some(block=>{
    let enter=0,exit=1
    for(const [start,end,low,high] of [[a[0],b[0],block.left,block.right],[a[1],b[1],block.top,block.bottom]]){
      const delta=end-start
      if(Math.abs(delta)<1e-9){if(start<=low||start>=high)return false;continue}
      const t0=(low-start)/delta,t1=(high-start)/delta
      enter=Math.max(enter,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1))
      if(enter>=exit)return false
    }
    return exit>0&&enter<1
  })
  const corners=blocks.flatMap(b=>[
    [b.left-epsilon,b.top-epsilon],[b.left-epsilon,b.bottom+epsilon],
    [b.right+epsilon,b.top-epsilon],[b.right+epsilon,b.bottom+epsilon],
  ] as Point[])
  const out:Point[]=[]
  for(let i=1;i<points.length;i++){
    const a=moveEndpoint(points[i-1]),b=moveEndpoint(points[i])
    if(!out.length)out.push(a)
    if(clear(a,b)){out.push(b);continue}
    const nodes=[a,b,...corners],cost=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set<number>()
    cost[0]=0
    for(let n=0;n<nodes.length;n++){
      let best=-1
      for(let j=0;j<nodes.length;j++)if(!visited.has(j)&&(best<0||cost[j]<cost[best]))best=j
      if(best<0||!Number.isFinite(cost[best]))break
      if(best===1)break
      visited.add(best)
      for(let j=0;j<nodes.length;j++)if(!visited.has(j)&&clear(nodes[best],nodes[j])){
        const next=cost[best]+Math.hypot(nodes[j][0]-nodes[best][0],nodes[j][1]-nodes[best][1])
        if(next<cost[j]){cost[j]=next;previous[j]=best}
      }
    }
    // All merged finite rectangles have an outside route; never draw a shortcut
    // through a court if malformed data makes the visibility search fail.
    if(previous[1]<0)continue
    const path:Point[]=[]
    for(let at=1;at>0;at=previous[at])path.push(nodes[at])
    out.push(...path.reverse())
  }
  return out.length?out:points.map(moveEndpoint)
}

/** Keep roadside decoration out of intersecting carriageways. Only the
 * decoration is split; road centres, widths and transport paths stay intact. */
export function streetEdgePieces(a: readonly number[], b: readonly number[], streets: StreetSegment[], clearance = .2): [Point, Point][] {
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<.05)return []
  const left=Math.min(a[0],b[0]),right=Math.max(a[0],b[0]),top=Math.min(a[1],b[1]),bottom=Math.max(a[1],b[1])
  let visible:[number,number][]=[[0,1]]
  for(const street of streets){
    const radius=street.width/2+clearance
    if(right<Math.min(street.a[0],street.b[0])-radius||left>Math.max(street.a[0],street.b[0])+radius||bottom<Math.min(street.a[1],street.b[1])-radius||top>Math.max(street.a[1],street.b[1])+radius)continue
    const dx=street.b[0]-street.a[0],dz=street.b[1]-street.a[1],length=Math.hypot(dx,dz)
    if(length<.05)continue
    const local=(p:readonly number[])=>[(p[0]-street.a[0])*dx/length+(p[1]-street.a[1])*dz/length,(-(p[0]-street.a[0])*dz+(p[1]-street.a[1])*dx)/length]
    const start=local(a),end=local(b)
    let enter=0,exit=1,hit=true
    for(const [from,to,low,high] of [[start[0],end[0],-clearance,length+clearance],[start[1],end[1],-street.width/2-clearance,street.width/2+clearance]]){
      const delta=to-from
      if(Math.abs(delta)<1e-9){if(from<=low||from>=high){hit=false;break};continue}
      const first=(low-from)/delta,last=(high-from)/delta
      enter=Math.max(enter,Math.min(first,last));exit=Math.min(exit,Math.max(first,last))
      if(enter>=exit){hit=false;break}
    }
    if(!hit)continue
    visible=visible.flatMap(([lo,hi]):[number,number][]=>{
      if(exit<=lo||enter>=hi)return [[lo,hi]]
      const pieces:[number,number][]=[]
      if(enter>lo)pieces.push([lo,enter])
      if(exit<hi)pieces.push([exit,hi])
      return pieces
    })
    if(!visible.length)break
  }
  const point=(t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
  return visible.map(([lo,hi]):[Point,Point]=>[point(lo),point(hi)]).filter(([p,q])=>Math.hypot(q[0]-p[0],q[1]-p[1])>.08)
}
