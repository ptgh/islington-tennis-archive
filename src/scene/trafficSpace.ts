/** Shared, bounded miniature traffic occupancy. Coordinates are borough units
 * (10 metres); club/legacy vehicles do not opt into this coordinator. */
export type TrafficPose={x:number;z:number;heading:number;halfWidth:number;halfLength:number}
export function trafficOverlaps(a:TrafficPose,b:TrafficPose,gap=.18){
 const dx=b.x-a.x,dz=b.z-a.z
 if(Math.hypot(dx,dz)>Math.hypot(a.halfWidth,a.halfLength)+Math.hypot(b.halfWidth,b.halfLength)+gap*Math.SQRT2)return false
 const axes=(p:TrafficPose)=>[[Math.cos(p.heading),-Math.sin(p.heading)],[Math.sin(p.heading),Math.cos(p.heading)]]
 const aa=axes(a),bb=axes(b)
 for(const [x,z] of [...aa,...bb]){
  const radius=(p:TrafficPose,axes:number[][])=>p.halfWidth*Math.abs(x*axes[0][0]+z*axes[0][1])+p.halfLength*Math.abs(x*axes[1][0]+z*axes[1][1])
  // Keep a visible nose-to-tail gap without padding neighbouring lanes until
  // a full-width bus and van can no longer pass each other on a 5 m road.
  const along=Math.max(Math.abs(x*aa[1][0]+z*aa[1][1]),Math.abs(x*bb[1][0]+z*bb[1][1]))
  const clearance=.012+(gap-.012)*along**4
  if(Math.abs(dx*x+dz*z)>=radius(a,aa)+radius(b,bb)+clearance)return false
 }
 return true
}
export function createTrafficSpace(){
 const poses=new Map<string,TrafficPose>(),claims=new Map<string,string>();let next=0
 return {
  claim(route:string,owner:string){const held=claims.get(route);if(held&&held!==owner)return false;claims.set(route,owner);return true},
  scope(){return `traffic-${next++}:`},
  clear(id:string,pose:TrafficPose){for(const [other,p] of poses)if(other!==id&&trafficOverlaps(pose,p))return false;return true},
  blockers(id:string,pose:TrafficPose){return [...poses].filter(([other,p])=>other!==id&&trafficOverlaps(pose,p)).map(([,p])=>p)},
  move(id:string,pose:TrafficPose){
   const previous=poses.get(id),turn=previous?Math.atan2(Math.sin(pose.heading-previous.heading),Math.cos(pose.heading-previous.heading)):0
   const steps=previous?Math.min(24,Math.max(1,Math.ceil((Math.hypot(pose.x-previous.x,pose.z-previous.z)+Math.abs(turn)*pose.halfLength)/.04))):1
   for(let i=1;i<=steps;i++){
    const t=i/steps,candidate=previous?{...pose,x:previous.x+(pose.x-previous.x)*t,z:previous.z+(pose.z-previous.z)*t,heading:previous.heading+turn*t}:pose
    for(const [other,p] of poses)if(other!==id&&trafficOverlaps(candidate,p))return false
   }
   poses.set(id,pose);return true
  },
  release(prefix:string){for(const id of poses.keys())if(id.startsWith(prefix))poses.delete(id);for(const [route,owner] of claims)if(owner.startsWith(prefix))claims.delete(route)},
  get size(){return poses.size},
 }
}
export type TrafficSpace=ReturnType<typeof createTrafficSpace>

/** Pass a stopped road user only through clear space in the other lane. The
 * sideways step holds route progress; returning left checks the road ahead. */
export function moveRoadTraffic(space:TrafficSpace,id:string,current:TrafficPose,next:TrafficPose,offset:number,delta:number){
 const rightX=Math.cos(next.heading),rightZ=-Math.sin(next.heading)
 const shifted=(amount:number)=>({...next,x:next.x+rightX*amount,z:next.z+rightZ*amount})
 const ahead={...next,x:next.x+Math.sin(next.heading)*.8,z:next.z+Math.cos(next.heading)*.8}
 if(offset!==0&&space.clear(id,ahead)&&space.move(id,next))return {pose:next,offset:0,advanced:true}
 const forward=shifted(offset)
 if(space.move(id,forward))return {pose:forward,offset,advanced:true}
 if(offset===0&&space.blockers(id,forward).some(p=>Math.cos(p.heading-next.heading)<.5))return null
 const passing=Math.max(-.25,offset-Math.max(0,delta)*.15),step=passing-offset
 if(step===0)return null
 const sideways={...current,x:current.x+rightX*step,z:current.z+rightZ*step}
 if(space.move(id,sideways))return {pose:sideways,offset:passing,advanced:false}
 return null
}
