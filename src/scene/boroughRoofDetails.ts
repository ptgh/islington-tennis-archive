import {containsPoint,roofBounds,type GeoFeature} from './boroughGeometry.ts';

/** Sparse illustrative roof furniture. A full clearance disc excludes concave
 * edges and courtyard holes, rather than trusting just a bounding-box centre. */
export function roofDetailSites(f:GeoFeature){
 const bounds=roofBounds(f.points),c=Math.cos(bounds.angle),s=Math.sin(bounds.angle),sites:{x:number;z:number;angle:number;nest:boolean}[]=[],radius=.43;
 const rings=[f.points,...f.holes??[]];
 const distance=(x:number,z:number,a:number[],b:number[])=>{const dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz,t=l2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l2)):0;return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);};
 const seed=Math.abs(Number(f.id));
 for(const [u,v] of [[0,0],[-.23,-.23],[.23,.23],[-.23,.23],[.23,-.23]]){
  const x=bounds.x+c*u*bounds.width+s*v*bounds.depth,z=bounds.z-s*u*bounds.width+c*v*bounds.depth;
  if(!containsPoint(x,z,f.points)||f.holes?.some(h=>containsPoint(x,z,h))||rings.some(r=>r.slice(1).some((b,i)=>distance(x,z,r[i],b)<radius))||sites.some(p=>Math.hypot(p.x-x,p.z-z)<1.2))continue;
  sites.push({x,z,angle:bounds.angle,nest:seed%11===0&&sites.length===0});if(sites.length===2)break;
 }
 return sites;
}
