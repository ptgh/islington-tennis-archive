import type * as THREE from 'three';
import type { GeoFeature } from './boroughGeometry.ts';

const towers=new Set([34038683,34038684,34038685]);
const buildings=new Set([...towers,34038687,177832589]);
/** Dedicated finishes on checked Barbican footprints only. The estate's concrete,
 * edge beams and column rhythm follow the City of London's listed-building account:
 * https://www.cityoflondon.gov.uk/services/barbican-estate/barbican-estate-history
 * Relief remains illustrative; rings, holes and the map's height model stay intact. */
export function addBarbicanArchitecture(f:GeoFeature,height:number,api:{concrete:THREE.Material;glass:THREE.Material;roof:THREE.Material;dark:THREE.Material;polygon:(f:GeoFeature,m:THREE.Material,y:number,height?:number)=>void;part:(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle?:number)=>void}){
 if(!buildings.has(Number(f.id)))return false;
 const {concrete,glass,roof,dark,polygon,part}=api,tower=towers.has(Number(f.id));
 polygon(f,concrete,.012,height);polygon(f,roof,height+.015);
 const floors=Math.max(1,Math.min(42,Math.round(Number(f.tags?.['building:levels'])||height/.3))),step=height/floors;
 const signed=f.points.slice(1).reduce((sum,b,i)=>sum+f.points[i][0]*b[1]-b[0]*f.points[i][1],0),sign=signed>0?1:-1;
 for(let i=1;i<f.points.length;i++){
  const a=f.points[i-1],b=f.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.18)continue;
  const nx=dz/len*sign,nz=-dx/len*sign,angle=-Math.atan2(dz,dx),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2;
  const strip=(m:THREE.Material,y:number,out:number,w:number,h:number,d:number)=>part(m,x+nx*out,y,z+nz*out,w,h,d,angle);
  // Dark inset glazing, projecting balcony edges and their shaded underside.
  for(let floor=0;floor<floors;floor++){
   const y=.012+floor*step;
   strip(glass,y+step*.53,.012,len-.035,step*.64,.016);
   strip(dark,y+step*.12,.025,len+.015,step*.10,tower?.09:.065);
   strip(concrete,y+step*.21,.045,len+.035,step*.16,tower?.14:.10);
  }
  // Deep piers rather than the generic cream domestic window frames.
  const bays=Math.min(12,Math.max(1,Math.round(len/(tower?.65:1.2))));
  for(let bay=0;bay<=bays;bay++){
   const t=(bay+.04)/(bays+.08),px=a[0]+dx*t+nx*.035,pz=a[1]+dz*t+nz*.035;
   part(concrete,px,height/2+.012,pz,.04,height,.075,angle);
  }
  strip(concrete,height+.035,.025,len+.04,.055,.10);
 }
 return true;
}
