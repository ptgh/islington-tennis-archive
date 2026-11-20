import * as THREE from 'three';
import {stationEntrances} from '../data/stationEntrances.ts';
import type {GeoFeature} from './boroughGeometry.ts';

/** Dalston's source building=roof is an open shelter, not a solid facade. */
export function addStationCanopy(f:GeoFeature,api:{roof:THREE.Material;metal:THREE.Material;polygon:(f:GeoFeature,m:THREE.Material,y:number,height?:number)=>void;part:(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle?:number)=>void}){
 if(!stationEntrances.some(e=>'canopy' in e&&e.canopy===Number(f.id)))return false;
 api.polygon(f,api.roof,.34,.018);
 for(const i of [0,6,7,8]){const [x,z]=f.points[i];api.part(api.metal,x,.17,z,.015,.34,.015);}
 return true;
}

export function createStationSignMaterials(){
 const signs=new Map<string,THREE.MeshStandardMaterial>();
 for(const entry of stationEntrances){
  let map:THREE.CanvasTexture|undefined;
  if(typeof document!=='undefined'){
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d');
   if(ctx){ctx.fillStyle='#233e62';ctx.fillRect(0,0,1024,192);ctx.fillStyle='#f4efdf';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 82px sans-serif';ctx.fillText(entry.name.toUpperCase(),512,100,970);map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;}
  }
  signs.set(entry.name,new THREE.MeshStandardMaterial({color:map?'#ffffff':'#233e62',...(map?{map,emissiveMap:map}:{}),roughness:.8,emissive:'#e8dfc5',emissiveIntensity:0}));
 }
 return signs;
}

/** Recessed-looking street portals sit on the recorded host wall, never its roof.
 * Their exact proportions are miniature detail, not surveyed station architecture. */
export function addStationEntrance(f:GeoFeature,api:{stone:THREE.Material;dark:THREE.Material;trim:THREE.Material;red:THREE.Material;orange:THREE.Material;signs:Map<string,THREE.MeshStandardMaterial>;part:(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle?:number)=>void;collect:(m:THREE.Material,g:THREE.BufferGeometry)=>void}){
 const entry=stationEntrances.find(e=>e.building===Number(f.id));if(!entry)return false;
 const a=f.points[entry.edge],b=f.points[entry.edge+1];if(!a||!b)return false;
 const x=(entry.lng+.115)*6900,z=-(entry.lat-51.549)*11100,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
 if(length<.001)return false;
 const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length))),px=a[0]+dx*t,pz=a[1]+dz*t,angle=-Math.atan2(dz,dx),nx=Math.sin(entry.facing),nz=Math.cos(entry.facing);
 const {part,collect,stone,dark,trim,red,orange,signs}=api;
 const piece=(m:THREE.Material,u:number,y:number,out:number,w:number,h:number,d:number)=>part(m,px+dx/length*u+nx*out,y,pz+dz/length*u+nz*out,w,h,d,angle);
 const width=entry.name==='Farringdon'?.84:entry.name==='Angel'?.52:.5;
 piece(stone,0,.024,.065,width+.08,.025,.18);
 piece(dark,0,.16,.027,width,.29,.018);
 for(const side of [-1,1])piece(trim,side*(width/2+.018),.17,.037,.035,.32,.055);
 piece(trim,0,.325,.055,width+.10,.045,.12);
 piece(trim,0,.13,.041,.018,.24,.012);
 // Name fascia and network roundel use the station's actual name and network.
 piece(dark,0,.39,.035,width+.10,.13,.045);
 const name=new THREE.PlaneGeometry(width+.08,.115);name.rotateY(entry.facing);name.translate(px+nx*.060,.39,pz+nz*.060);collect(signs.get(entry.name)!,name);
 const ring=new THREE.RingGeometry(.073,.108,32);ring.rotateY(entry.facing);ring.translate(px+nx*.064,.59,pz+nz*.064);collect(entry.network==='overground'?orange:red,ring);
 piece(signs.get(entry.name)!,0,.59,.066,.265,.05,.012);
 return true;
}
