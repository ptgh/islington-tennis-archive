import * as THREE from 'three'
import { inCourtArea, type CourtArea } from './courtGeometry.ts'

/** Round authored walking corners within a small, court-safe envelope. The
 * returned line is shared by the ground finish and its miniature walkers. */
export function roundedWalkPath(source:THREE.Vector3[],exclusions:CourtArea[],closed=true,width=1.4){
  const points=source.filter((p,i)=>!i||p.distanceToSquared(source[i-1])>1e-8)
  if(closed&&points.length>1&&points[0].distanceToSquared(points.at(-1)!)<1e-8)points.pop()
  if(points.length<3)return points.map(p=>p.clone())
  const out:THREE.Vector3[]=[]
  for(let i=0;i<points.length;i++){
    const p=points[i]
    if(!closed&&(i===0||i===points.length-1)){out.push(p.clone());continue}
    const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length],incoming=p.clone().sub(a),outgoing=b.clone().sub(p)
    const first=incoming.length(),last=outgoing.length(),turn=incoming.normalize().dot(outgoing.normalize()),reach=Math.min(3,first*.25,last*.25)
    if(reach<.2||turn>.98||turn<-.8){out.push(p.clone());continue}
    const entry=p.clone().addScaledVector(incoming,-reach),exit=p.clone().addScaledVector(outgoing,reach),curve:THREE.Vector3[]=[]
    const steps=Math.max(4,Math.ceil(entry.distanceTo(exit)/.4))
    for(let j=0;j<=steps;j++){
      const t=j/steps
      curve.push(entry.clone().multiplyScalar((1-t)**2).addScaledVector(p,2*t*(1-t)).addScaledVector(exit,t*t))
    }
    if(curve.some(q=>inCourtArea(q.x,q.z,exclusions,Math.max(1.2,width/2+.4))))out.push(p.clone())
    else out.push(...curve)
  }
  return out
}

/** Short, straight approaches from an existing park walk to court aprons.
 * Reject obstructed or distant links instead of inventing a wandering detour. */
export function courtWalkApproaches(loop:THREE.Vector3[],targets:THREE.Vector3[],exclusions:CourtArea[],maxLength=18){
  const links:[THREE.Vector3,THREE.Vector3][]=[]
  if(loop.length<2)return links
  for(const target of targets){
    const candidates=loop.map((a,i)=>new THREE.Line3(a,loop[(i+1)%loop.length]).closestPointToPoint(target,true,new THREE.Vector3())).sort((a,b)=>a.distanceToSquared(target)-b.distanceToSquared(target))
    for(const start of candidates){
      const length=start.distanceTo(target)
      if(length>maxLength)break
      if(length<.7)break
      const steps=Math.ceil(length/.25)
      if(Array.from({length:steps+1},(_,i)=>start.clone().lerp(target,i/steps)).some(p=>inCourtArea(p.x,p.z,exclusions,1.2)))continue
      links.push([start,target.clone()]);break
    }
  }
  return links
}

/** Split the drawn loop at court boundaries. Open pieces are walked in both
 * directions; no spline can cut across a corner or reconnect through a court. */
export function pedestrianPaths(points: THREE.Vector3[], exclusions: CourtArea[]) {
  if(points.length<2)return []
  const pieces:THREE.Vector3[][]=[]
  let current:THREE.Vector3[]=[],clipped=false
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],steps=Math.max(1,Math.ceil(a.distanceTo(b)/.7))
    for(let j=0;j<steps;j++){
      const p=a.clone().lerp(b,j/steps)
      if(inCourtArea(p.x,p.z,exclusions,1.2)){
        clipped=true
        if(current.length>1)pieces.push(current)
        current=[]
      }else current.push(p)
    }
  }
  if(!clipped)return [{points:[...points,points[0]],closed:true}]
  if(current.length>1)pieces.push(current)
  if(pieces.length>1&&pieces[0][0].distanceTo(points[0])<.01&&pieces.at(-1)!.at(-1)!.distanceTo(points[0])<1){
    pieces[0]=[...pieces.pop()!,...pieces[0]]
  }
  return pieces.filter(p=>p.length>1&&p.slice(1).reduce((n,v,i)=>n+v.distanceTo(p[i]),0)>8).map(p=>({points:p,closed:false}))
}
