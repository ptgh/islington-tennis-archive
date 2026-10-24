import * as THREE from 'three'
import { inCourtArea, type CourtArea } from './courtGeometry.ts'

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
