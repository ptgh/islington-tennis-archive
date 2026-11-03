import { skyPosition } from '../scene/sceneAtmosphere.ts'
import { londonPreviewTime } from './lightingTime.ts'

const DAY=86400000
const ISLINGTON={lat:51.54,lng:-.105}
export const MOON_PHASES=['New moon','Waxing crescent','First quarter','Waxing gibbous','Full moon','Waning gibbous','Last quarter','Waning crescent'] as const
export const MOON_SYMBOLS=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'] as const
const illumination=(time:number)=>skyPosition(new Date(time),ISLINGTON).illumination

/** Estimated solar crossings of the apparent horizon (-0.833 degrees), using
 * the scene's existing orbital model and the London civil day, including DST.
 * Refraction varies: display these as estimates, not observing ephemerides.
 * Horizon convention: https://gml.noaa.gov/grad/solcalc/calcdetails.html */
export function sunTimes(date:Date) {
 const start=londonPreviewTime(date,0),end=londonPreviewTime(new Date(start+36*3600000),0)
 const horizon=Math.sin(-.833*Math.PI/180)
 const elevation=(time:number)=>skyPosition(new Date(time),ISLINGTON).sun.y-horizon
 let sunrise:number|null=null,sunset:number|null=null,previous=start,above=elevation(start)>0
 for(let time=start+15*60000;time<=end;time+=15*60000){
  const next=elevation(time)>0
  if(next!==above){
   let lo=previous,hi=time
   for(let i=0;i<20;i++){const mid=(lo+hi)/2;if((elevation(mid)>0)===above)lo=mid;else hi=mid}
   if(next)sunrise=(lo+hi)/2;else sunset=(lo+hi)/2
  }
  previous=time;above=next
 }
 return {sunrise,sunset}
}
export function moonPhase(date:Date){
 const time=date.getTime(),lit=illumination(time),waxing=illumination(time+3*3600000)>illumination(time-3*3600000)
 const angle=Math.acos(Math.max(-1,Math.min(1,1-2*lit))),fraction=(waxing?angle:Math.PI*2-angle)/(Math.PI*2)
 const index=lit<.01?0:lit>.99?4:Math.abs(lit-.5)<.025?(waxing?2:6):lit<.5?(waxing?1:7):(waxing?3:5)
 return {illumination:lit,waxing,fraction,index,name:MOON_PHASES[index],symbol:MOON_SYMBOLS[index]}
}
/** Locate the next illumination maximum. The low-order scene orbit deliberately
 * omits lunar perturbations, so the UI reports an approximate calendar date. */
export function nextFullMoon(date:Date){
 const start=date.getTime(),step=6*3600000
 for(let time=start;time<start+35*DAY;time+=step){
  if(illumination(time)>=illumination(time-step)&&illumination(time)>=illumination(time+step)){
   let lo=time-step,hi=time+step
   for(let i=0;i<28;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(illumination(a)<illumination(b))lo=a;else hi=b}
   const peak=(lo+hi)/2
   if(peak>=start)return new Date(peak)
  }
 }
 throw new Error('No full moon found in the next cycle')
}
