export type ResponderKind='responseFire'|'responsePolice'|'responseAmbulance'
/** Reuse an existing car slot and its checked road/traffic footprint. */
export function responderKind(seed:number,index:number):ResponderKind|null{
 const choice=Math.abs(seed)%11
 return index===0&&choice<3?(['responseFire','responsePolice','responseAmbulance'] as const)[choice]:null
}
