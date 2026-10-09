import * as THREE from 'three';
/** Visible miniature floodlights: shaded court pools, soft shafts and luminous lamps. */
export function createCourtLighting(){
 const root=new THREE.Group(),night=new THREE.Group();root.add(night);night.visible=false;
 const pole=new THREE.MeshStandardMaterial({color:'#526860',roughness:.8});
 const lamp=new THREE.MeshStandardMaterial({color:'#e1dfcf',emissive:'#fff5dc',emissiveIntensity:0});
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const radius=Math.hypot((x+0.5-size/2)/(size/2),(y+0.5-size/2)/(size/2));const i=(y*size+x)*4;data[i]=255;data[i+1]=247;data[i+2]=213;data[i+3]=Math.round(Math.pow(Math.max(0,1-radius),2)*255);}
 const glow=new THREE.DataTexture(data,size,size);glow.needsUpdate=true;glow.magFilter=THREE.LinearFilter;glow.minFilter=THREE.LinearFilter;
 const halo=new THREE.SpriteMaterial({map:glow,color:'#fff4cf',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
 const beam=new THREE.MeshBasicMaterial({color:'#fff4d0',transparent:true,opacity:.025,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false});
 const pool=new THREE.MeshBasicMaterial({map:glow,color:'#efffdc',transparent:true,opacity:.07,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
 const box=new THREE.BoxGeometry(1,1,1),plane=new THREE.PlaneGeometry(1,1),cone=new THREE.ConeGeometry(1,1,24,1,true);
 function add(x:number,z:number,width:number,depth:number,rotation=0,scale=1){
  const g=new THREE.Group(),n=new THREE.Group();g.position.set(x,0,z);n.position.copy(g.position);g.rotation.y=n.rotation.y=rotation;root.add(g);night.add(n);
  const h=6.5*scale;
  for(const side of [-1,1])for(const end of [-1,1]){
   const lx=side*(width/2+.7*scale),lz=end*(depth/2-1.3*scale);
   const mast=new THREE.Mesh(box,pole);mast.position.set(lx,h/2,lz);mast.scale.set(.15*scale,h,.15*scale);g.add(mast);
   const head=new THREE.Mesh(box,lamp);head.position.set(lx,h,lz);head.scale.set(1.5*scale,.32*scale,.8*scale);g.add(head);
   const bloom=new THREE.Sprite(halo);bloom.position.copy(head.position);bloom.scale.setScalar(4.5*scale);n.add(bloom);
   const target=new THREE.Vector3(side*width*.15,.38,end*depth*.23),tip=new THREE.Vector3(lx,h,lz),axis=tip.clone().sub(target);
   const shaft=new THREE.Mesh(cone,beam);shaft.position.copy(target).add(tip).multiplyScalar(.5);shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.clone().normalize());shaft.scale.set(width*.65,axis.length(),width*.65);n.add(shaft);
   const wash=new THREE.Mesh(plane,pool);wash.rotation.x=-Math.PI/2;wash.position.copy(target).setY(.385);wash.scale.set(width*1.4,depth*.95,1);n.add(wash);
  }
 }
 return {root,add,setNight(value:boolean){night.visible=value;lamp.emissiveIntensity=value?4:0;},dispose(){glow.dispose();}};
}
