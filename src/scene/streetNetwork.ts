import type { CourtArea } from './courtGeometry.ts'

type Point = [number, number]
export type StreetSegment = { a: readonly number[]; b: readonly number[]; width: number }
type Block = { left: number; right: number; top: number; bottom: number }
const epsilon = .04
const inside = ([x,z]: Point, b: Block) => x>b.left && x<b.right && z>b.top && z<b.bottom

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
