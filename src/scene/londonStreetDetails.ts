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
  signs.set(name,new THREE.MeshStandardMaterial({color:map?'#ffffff':'#f0ecdd',...(map?{map}:{}),roughness:.85}));
 }
 return signs;
}
/** Street-name plates use matching source road IDs; the exact plate positions are
 * decorative. Artwork and rooftop masts use their checked OSM nodes. */
export function addLondonStreetDetails(data:BoroughCell,cellId:string|undefined,api:{bronze:THREE.Material;stone:THREE.Material;metal:THREE.Material;trim:THREE.Material;weatheringSteel:THREE.Material;signs:Map<string,THREE.MeshStandardMaterial>;part:(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,angle?:number)=>void;collect:(m:THREE.Material,g:THREE.BufferGeometry)=>void}){
 const {bronze,stone,metal,trim,weatheringSteel,signs,part,collect}=api;
 const within=(x:number,z:number,f:{points:number[][];holes?:number[][][]})=>containsPoint(x,z,f.points)&&!f.holes?.some(h=>containsPoint(x,z,h));
 const seen=new Set<string>();let count=0,masts=0,artworks=0;
 for(const road of data.roads){
  const name=names.get(String(road.id).split(':')[0]);if(!name||seen.has(name)||count>=5)continue;
  const profile=boroughRoadProfile(road.kind);if(profile.walking)continue;
  for(let i=1;i<road.points.length;i++){
   const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<1.1)continue;
   const offset=profile.width/2+.13,x=(a[0]+b[0])/2-dz/len*offset,z=(a[1]+b[1])/2+dx/len*offset;
   if([...data.buildings,...data.water].some(f=>within(x,z,f)))continue;
   const angle=-Math.atan2(dz,dx),nx=Math.sin(angle),nz=Math.cos(angle);
   part(metal,x,.13,z,.014,.26,.014);part(metal,x,.27,z,.46,.112,.012,angle);
   // Separate front faces keep the lettering upright from either pavement.
   for(const side of [-1,1]){const g=new THREE.PlaneGeometry(.44,.096);g.rotateY(angle+(side<0?Math.PI:0));g.translate(x+nx*.007*side,.27,z+nz*.007*side);collect(signs.get(name)!,g);}
   seen.add(name);count++;break;
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
   part(stone,x,.09,z+.055,.32,.18,.52);part(stone,x,.186,z+.055,.34,.012,.54);part(bronze,x,.245,z-.055,.17,.12,.15);
   // Folded torso, mechanical joints and dividers follow the Paolozzi maquette
   // described by the Royal Society. Proportions remain a miniature illustration.
   const lump=(dx:number,y:number,dz:number,w:number,h:number,d:number,lean=0)=>{const g=new THREE.SphereGeometry(1,10,8);g.scale(w,h,d);g.rotateX(lean);g.translate(x+dx,y,z+dz);collect(bronze,g);};
   const limb=(a:number[],b:number[],r:number)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start),g=new THREE.CylinderGeometry(r*.8,r,delta.length(),8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(x+(a[0]+b[0])/2,(a[1]+b[1])/2,z+(a[2]+b[2])/2);collect(bronze,g);};
   lump(0,.36,-.005,.079,.108,.063,.65);lump(0,.405,.095,.052,.057,.054,.4);
   for(const side of [-1,1]){
    limb([side*.06,.28,-.035],[side*.075,.27,.115],.035);limb([side*.075,.27,.115],[side*.075,.195,.145],.025);lump(side*.075,.192,.17,.029,.016,.048);
    limb([side*.072,.385,.025],[side*.095,.30,.105],.023);limb([side*.095,.30,.105],[side*.04,.235,.205],.018);
    lump(side*.083,.285,.115,.031,.025,.027);lump(side*.09,.305,.105,.025,.024,.024);lump(side*.04,.235,.205,.021,.021,.021);
   }
   // One pair, joined at its hinge in the left hand; the feet reach the plinth.
   for(const side of [-1,1])limb([-.04,.235,.205],[-.04+side*.045,.19,.28],.005);
   for(const side of [-1,1])part(bronze,x+side*.081,.37,z+.01,.012,.035,.048);
  }else{
   // A restrained miniature of Paradigm's growing, stacked tetrahedra.
   part(stone,x,.018,z,.14,.036,.14);
   let y=.04;
   for(let i=0;i<17;i++){
    const size=.045+i*.010,step=.035+i*.0048,g=new THREE.TetrahedronGeometry(size,0);g.rotateY(i*2.399);g.translate(x+Math.sin(i*.5)*size*.25,y+step/2,z+Math.cos(i*.5)*size*.25);
    // Warm, subtly varied faces read as weathering steel, distinct from the
    // Standard's painted red capsule. No additional texture downloads.
    const colors=new Float32Array(g.getAttribute('position').count*3);
    for(let face=0;face<4;face++){const shade=new THREE.Color().setRGB(.82+((i*7+face*3)%11)*.018,.78+((i*3+face*5)%9)*.019,.71+((i*5+face*7)%8)*.021);for(let vertex=0;vertex<3;vertex++)shade.toArray(colors,(face*3+vertex)*3);}
    g.setAttribute('color',new THREE.BufferAttribute(colors,3));collect(weatheringSteel,g);y+=step;
   }
  }
 }
 return {streetNames:count,masts,artworks};
}
