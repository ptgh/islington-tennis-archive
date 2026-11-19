import * as THREE from 'three';
import {londonArtworks,londonMasts,londonStreetNames} from '../data/londonDetails.ts';
import {buildingHeight,containsPoint,type BoroughCell} from './boroughGeometry.ts';
import {boroughRoadProfile} from './boroughStreetEdges.ts';
const names=new Map(londonStreetNames.map(s=>[String(s.id),s.name]));
export function createStreetSignMaterials(){
 const signs=new Map<string,THREE.MeshStandardMaterial>();
 for(const name of new Set(names.values())){
  let map:THREE.CanvasTexture|undefined;
  if(typeof document!=='undefined'){
   const c=document.createElement('canvas');c.width=512;c.height=112;const ctx=c.getContext('2d');
   if(ctx){ctx.fillStyle='#eee9db';ctx.fillRect(0,0,512,112);ctx.strokeStyle='#42534b';ctx.lineWidth=8;ctx.strokeRect(7,7,498,98);ctx.fillStyle='#31483d';ctx.font='600 42px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name.toUpperCase(),256,57,470);map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;}
  }
  signs.set(name,new THREE.MeshStandardMaterial({color:'#f0ecdd',...(map?{map}:{}),roughness:.85,side:THREE.DoubleSide}));
 }
 return signs;
}
/** Street-name plates use matching source road IDs; the exact plate positions are
 * decorative. Artwork and rooftop masts use their checked OSM nodes. */
export function addLondonStreetDetails(data:BoroughCell,cellId:string|undefined,api:{bronze:THREE.Material;stone:THREE.Material;metal:THREE.Material;trim:THREE.Material;red:THREE.Material;signs:Map<string,THREE.MeshStandardMaterial>;part:(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle?:number)=>void;collect:(m:THREE.Material,g:THREE.BufferGeometry)=>void}){
 const {bronze,stone,metal,trim,red,signs,part,collect}=api;
 const within=(x:number,z:number,f:{points:number[][];holes?:number[][][]})=>containsPoint(x,z,f.points)&&!f.holes?.some(h=>containsPoint(x,z,h));
 const seen=new Set<string>();let count=0,masts=0,artworks=0;
 for(const road of data.roads){
  const name=names.get(String(road.id).split(':')[0]);if(!name||seen.has(name)||count>=5)continue;
  const profile=boroughRoadProfile(road.kind);if(profile.walking)continue;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<1.1)continue;
   const offset=profile.width/2+.13,x=(a[0]+b[0])/2-dz/len*offset,z=(a[1]+b[1])/2+dx/len*offset;
   if([...data.buildings,...data.water].some(f=>within(x,z,f)))continue;
   part(metal,x,.13,z,.014,.26,.014);const g=new THREE.PlaneGeometry(.44,.096);g.rotateY(-Math.atan2(dz,dx));g.translate(x,.27,z);collect(signs.get(name)!,g);seen.add(name);count++;break;
  }
 }
 for(const mast of londonMasts){
  const host=data.buildings.find(b=>Number(b.id)===mast.buildingId);if(!host)continue;
  const x=(mast.lng+.115)*6900,z=-(mast.lat-51.549)*11100;if(!within(x,z,host))continue;
  masts++;const y=buildingHeight(host.tags,host.points)+.02;
  part(metal,x,y+.24,z,.025,.48,.025);part(trim,x,y+.015,z,.18,.03,.18);
  for(let i=0;i<3;i++){const t=i*Math.PI*2/3;part(trim,x+Math.sin(t)*.065,y+.32,z+Math.cos(t)*.065,.055,.22,.035,t);}
 }
 if(!cellId)return {streetNames:count,masts,artworks};
 for(const art of londonArtworks){
  const x=(art.lng+.115)*6900,z=-(art.lat-51.549)*11100;
  if(`${Math.floor(x/40)}_${Math.floor(z/40)}`!==cellId||data.buildings.some(f=>within(x,z,f)))continue;
  artworks++;if(art.kind==='newton'){
   part(stone,x,.065,z,.32,.13,.38);part(bronze,x,.18,z-.045,.16,.14,.15);
   // Bent seated figure, articulated arms and the paired measuring dividers.
   const lump=(dx:number,y:number,dz:number,w:number,h:number,d:number)=>{const g=new THREE.SphereGeometry(1,8,6);g.scale(w,h,d);g.translate(x+dx,y,z+dz);collect(bronze,g);};
   lump(0,.34,-.025,.075,.12,.065);lump(0,.43,.055,.052,.055,.052);
   for(const side of [-1,1]){part(bronze,x+side*.06,.22,z+.07,.05,.05,.16);part(bronze,x+side*.065,.16,z+.13,.045,.15,.045);lump(side*.083,.31,.065,.026,.065,.028);part(bronze,x+side*.065,.25,z+.15,.026,.10,.026,.18*side);part(bronze,x+side*.025,.16,z+.23,.012,.14,.012,side*.3);}
  }else{
   // A restrained miniature of Paradigm's growing, stacked tetrahedra.
   part(stone,x,.018,z,.14,.036,.14);
   let y=.04;
   for(let i=0;i<17;i++){
    const size=.045+i*.010,step=.035+i*.0048,g=new THREE.TetrahedronGeometry(size,0);g.rotateY(i*2.399);g.translate(x+Math.sin(i*.5)*size*.25,y+step/2,z+Math.cos(i*.5)*size*.25);collect(red,g);y+=step;
   }
  }
 }
 return {streetNames:count,masts,artworks};
}
