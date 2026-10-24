export type GroundPoint = number[]
export type AccessPath = { id: number; points: GroundPoint[]; width: number; walkable: boolean }
type Candidate = { route: AccessPath; segment: number; t: number; point: GroundPoint; distance: number }

/** Add short illustrative access links without moving any mapped geometry.
 * The caller checks venue boundaries, buildings, courts and barriers.
 */
export function connectAccessPaths(routes: AccessPath[], allows: (a: GroundPoint, b: GroundPoint) => boolean, maxGap = 8) {
  const splits=new Map<string,GroundPoint[]>(),links:AccessPath[]=[],seen=new Set<string>()
  const split=(candidate:Candidate)=>{
    if(!candidate.route.walkable||candidate.t<.0001||candidate.t>.9999)return
    const key=candidate.route.id+':'+candidate.segment
    if(!splits.has(key))splits.set(key,[])
    splits.get(key)!.push(candidate.point)
  }
  for(const route of routes.filter(r=>r.walkable))for(const end of [route.points[0],route.points.at(-1)!]){
    const candidates:Candidate[]=[]
    for(const other of routes)if(other.id!==route.id)for(let i=1;i<other.points.length;i++){
      const a=other.points[i-1],b=other.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz
      if(length<.0001)continue
      const t=Math.max(0,Math.min(1,((end[0]-a[0])*dx+(end[1]-a[1])*dz)/length)),point=[a[0]+dx*t,a[1]+dz*t]
      const distance=Math.hypot(point[0]-end[0],point[1]-end[1])
      if(distance<=maxGap)candidates.push({route:other,segment:i,t,point,distance})
    }
    candidates.sort((a,b)=>a.distance-b.distance)
    if(candidates[0]?.distance<.0001){split(candidates[0]);continue}
    for(const candidate of candidates){
      // Access paths meet the pavement edge; pedestrians don't enter a road lane.
      const reach=candidate.route.walkable?candidate.point:[
        candidate.point[0]+(end[0]-candidate.point[0])*(candidate.route.width/2+.4)/candidate.distance,
        candidate.point[1]+(end[1]-candidate.point[1])*(candidate.route.width/2+.4)/candidate.distance,
      ]
      if(!candidate.route.walkable&&candidate.distance<=candidate.route.width/2+.4)break
      if(!allows(end,reach))continue
      const key=[end,reach].map(p=>p.map(n=>Math.round(n*100)).join(',')).sort().join(':')
      if(!seen.has(key)){
        seen.add(key);links.push({id:-1000000-links.length,points:[end,reach],width:1.8,walkable:true})
      }
      split(candidate);break
    }
  }
  const paths=routes.map(route=>({...route,points:route.points.flatMap((a,i)=>{
    const b=route.points[i+1]
    if(!b)return [a]
    const additions=splits.get(route.id+':'+(i+1))||[]
    return [a,...additions.sort((p,q)=>Math.hypot(p[0]-a[0],p[1]-a[1])-Math.hypot(q[0]-a[0],q[1]-a[1]))]
  })}))
  return {paths,links}
}

/** Closed walks through actual connected edges, including junctions. Backtracking
 * at a branch end uses that same path, never a closing chord across a building.
 */
export function connectedWalkRoutes(paths: AccessPath[], limit = 4) {
  const nodes:GroundPoint[]=[],edges=new Map<number,Set<number>>(),ids=new Map<string,number>()
  const node=(p:GroundPoint)=>{
    const key=p.map(n=>Math.round(n*20)).join(',')
    if(!ids.has(key)){ids.set(key,nodes.length);nodes.push(p);edges.set(nodes.length-1,new Set())}
    return ids.get(key)!
  }
  for(const route of paths.filter(p=>p.walkable))for(let i=1;i<route.points.length;i++){
    const a=node(route.points[i-1]),b=node(route.points[i])
    if(a!==b){edges.get(a)!.add(b);edges.get(b)!.add(a)}
  }
  const ordered=[...edges.keys()].filter(i=>edges.get(i)!.size).sort((a,b)=>nodes[a][0]-nodes[b][0]||nodes[a][1]-nodes[b][1])
  const walks:GroundPoint[][]=[]
  for(let i=0;i<Math.min(limit,ordered.length);i++){
    const start=ordered[Math.floor(i*ordered.length/Math.min(limit,ordered.length))],walk=[nodes[start]],used=new Set<string>()
    const visit=(at:number)=>{
      for(const next of [...edges.get(at)!].sort((a,b)=>((a+i*7)%nodes.length)-((b+i*7)%nodes.length))){
        const key=[at,next].sort((a,b)=>a-b).join(':')
        if(used.has(key)||used.size>=48)continue
        used.add(key);walk.push(nodes[next]);visit(next);walk.push(nodes[at])
      }
    }
    visit(start)
    if(walk.length>2)walks.push(walk.slice(0,-1))
  }
  return walks
}

export function crossingSegments(a:GroundPoint,b:GroundPoint,c:GroundPoint,d:GroundPoint) {
  const cross=(p:GroundPoint,q:GroundPoint,r:GroundPoint)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
  return cross(a,b,c)*cross(a,b,d)<-1e-8&&cross(c,d,a)*cross(c,d,b)<-1e-8
}
