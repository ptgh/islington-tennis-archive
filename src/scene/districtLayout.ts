import geography from '../data/caledonian-geography.json' with {type:'json'}
import {projectPoint} from './courtGeometry.ts'

export type DistrictPoint=[number,number]
export type DistrictFeature={id:number;tags:Record<string,string>;points:DistrictPoint[]}
export const districtGeography=geography
export const districtFeatures:DistrictFeature[]=/* @__PURE__ */ geography.features.map(f=>({...f,tags:f.tags as unknown as Record<string,string>,points:f.points.map(([lng,lat])=>projectPoint(lng,lat))}))
export const districtClosed=(points:DistrictPoint[])=>points.length>3&&points[0][0]===points.at(-1)![0]&&points[0][1]===points.at(-1)![1]
export function districtCentre(points:DistrictPoint[]):DistrictPoint{
 const ring=districtClosed(points)?points.slice(0,-1):points
 return [ring.reduce((v,p)=>v+p[0],0)/ring.length,ring.reduce((v,p)=>v+p[1],0)/ring.length]
}
export function districtBounds(points:DistrictPoint[]){
 const ring=districtClosed(points)?points.slice(0,-1):points
 let best={x:0,z:0,width:0,depth:0,angle:0,area:Infinity}
 for(let i=0;i<ring.length;i++){
  const a=ring[i],b=ring[(i+1)%ring.length],angle=-Math.atan2(b[1]-a[1],b[0]-a[0]),c=Math.cos(angle),s=Math.sin(angle)
  const xs=ring.map(([x,z])=>x*c-z*s),zs=ring.map(([x,z])=>x*s+z*c)
  const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...zs),bottom=Math.max(...zs),area=(right-left)*(bottom-top)
  if(area<best.area)best={x:(left+right)/2*c+(top+bottom)/2*s,z:-(left+right)/2*s+(top+bottom)/2*c,width:right-left,depth:bottom-top,angle,area}
 }
 if(best.width>best.depth)[best.width,best.depth,best.angle]=[best.depth,best.width,best.angle+Math.PI/2]
 return best
}
/** Scene units remain ten metres. Missing heights are explicitly estimates. */
export function districtBuildingHeight(feature:DistrictFeature){
 if(feature.id===37371124)return {metres:47.5,estimated:false,source:'https://www.islington.gov.uk/physical-activity-parks-and-trees/parks-and-green-space/your-local-parks/caledonian-park'}
 const height=feature.tags.height?.match(/^([\d.]+)\s*m?$/)?.[1]
 if(height&&Number(height)>0)return {metres:Number(height),estimated:false,source:`https://www.openstreetmap.org/way/${feature.id}`}
 const levels=Number(feature.tags['building:levels'])
 return {metres:levels>0?levels*3.1:['garage','garages','shed'].includes(feature.tags.building)?3:9.3,estimated:true,source:levels>0?'OSM levels with estimated floor height':'Unmeasured default height'}
}
