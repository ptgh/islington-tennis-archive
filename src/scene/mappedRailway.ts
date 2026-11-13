type Point=readonly number[]
type Way={points:readonly Point[]}
type Strip={x:number;z:number;angle:number;length:number}

export const RAIL_SLEEPER_SPACING=.68
export const RAIL_SLEEPER_LENGTH=.23

/** Metre-based detail follows each stored centreline exactly. Sleeper spacing
 * carries through source vertices rather than restarting at every segment. */
export function mappedRailwayParts(ways:readonly Way[]) {
 const ballast:Strip[]=[],rails:Strip[]=[],sleepers:{x:number;z:number;angle:number}[]=[]
 for(const way of ways){
  let nextSleeper=RAIL_SLEEPER_SPACING/2
  for(let i=1;i<way.points.length;i++){
   const a=way.points[i-1],b=way.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)
   if(length<.001)continue
   const ux=dx/length,uz=dz/length,angle=-Math.atan2(dz,dx),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2
   ballast.push({x,z,angle,length})
   for(const side of [-1,1])rails.push({x:x-uz*.7175*side,z:z+ux*.7175*side,angle,length})
   for(;nextSleeper<length;nextSleeper+=RAIL_SLEEPER_SPACING)sleepers.push({x:a[0]+ux*nextSleeper,z:a[1]+uz*nextSleeper,angle})
   nextSleeper-=length
  }
 }
 return {ballast,rails,sleepers}
}
