import type { CourtArea } from './courtGeometry.ts'

type Point = [number, number]
export type StreetSegment = { a: readonly number[]; b: readonly number[]; width: number }
type Block = { left: number; right: number; top: number; bottom: number }
export type StreetPark = {x:number;z:number;rx:number;rz:number}
const epsilon = .04
const inside = ([x,z]: Point, b: Block) => x>b.left && x<b.right && z>b.top && z<b.bottom

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
