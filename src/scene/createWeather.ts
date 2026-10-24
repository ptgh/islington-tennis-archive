import * as THREE from 'three';
export type WeatherSceneKind = 'clear' | 'cloud' | 'rain' | 'snow';

/** Fixed world positions: camera gestures never change the weather's ground footprint. */
export function createWeather() {
  const root = new THREE.Group();
  root.name = 'Neighbourhood weather';
  const clouds = new THREE.Group();
  root.add(clouds);
  // Soft, shaded density maps replace overlapping transparent solid spheres.
  // One owned texture is shared by all cloud layers; no downloads or new passes.
  const size=256,pixels=new Uint8Array(size*size*4);
  const hash=(x:number,y:number)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const field=(x:number,y:number,scale:number)=>{
    const a=Math.floor(x/scale),b=Math.floor(y/scale),u=x/scale-a,v=y/scale-b;
    const sx=u*u*(3-2*u),sy=v*v*(3-2*v);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(a,b),hash(a+1,b),sx),THREE.MathUtils.lerp(hash(a,b+1),hash(a+1,b+1),sx),sy);
  };
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size-.5,v=y/size-.5;
    let density=0;
    for(const [cx,cy,rx,ry] of [[-.28,-.08,.24,.17],[-.13,.12,.20,.27],[.08,.05,.25,.24],[.30,-.10,.18,.15],[.02,-.17,.34,.13]])density+=Math.exp(-(((u-cx)/rx)**2+((v-cy)/ry)**2)*2);
    const texture=field(x,y,31)*.55+field(x,y,12)*.3+field(x,y,5)*.15;
    const alpha=THREE.MathUtils.smoothstep(density+(texture-.5)*.7,.16,.95);
    const shade=190+y/size*47+(texture-.5)*20,offset=(y*size+x)*4;
    pixels.set([shade,shade+2,shade+3,alpha*235],offset);
  }
  const cloudMap=new THREE.DataTexture(pixels,size,size,THREE.RGBAFormat);
  cloudMap.colorSpace=THREE.SRGBColorSpace;cloudMap.magFilter=THREE.LinearFilter;cloudMap.minFilter=THREE.LinearMipmapLinearFilter;cloudMap.generateMipmaps=true;cloudMap.needsUpdate=true;
  const cloudMaterial = new THREE.SpriteMaterial({map:cloudMap,color:'#eef0ee',transparent:true,opacity:.64,depthWrite:false,fog:true});
  const underside = cloudMaterial.clone();underside.color.set('#8c9a9f');
  const cells = [{x:90,z:-120,s:1},{x:-140,z:60,s:.9},{x:190,z:180,s:.85},{x:-70,z:-300,s:1.1},{x:35,z:340,s:.85}];
  const banks:{group:THREE.Group;top:THREE.SpriteMaterial;bottom:THREE.SpriteMaterial}[]=[];
  for(const [index,cell] of cells.entries()){
    const group=new THREE.Group();group.position.set(cell.x,74,cell.z);group.scale.setScalar(cell.s);
    const top=cloudMaterial.clone(),bottom=underside.clone();top.rotation=(index-2)*.035;banks.push({group,top,bottom});
    for(const [x,y,z,width,height,dark] of [[0,-5,0,100,25,1],[-16,7,2,76,42,0],[22,1,-3,68,32,0]]){
      const cloud=new THREE.Sprite(dark?bottom:top);cloud.position.set(x,y,z);cloud.scale.set(width,height,1);group.add(cloud);
    }
    clouds.add(group);
  }
  let seed=72;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const drops=Array.from({length:1600},(_,i)=>{const c=cells[i%cells.length];return {x:i<100?c.x+(random()-.5)*88*c.s:(random()-.5)*940,z:i<100?c.z+(random()-.5)*43*c.s:(random()-.5)*940,phase:random(),speed:.65+random()*.5,length:3.5+random()*3};});
  const positions=new Float32Array(drops.length*6);
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const rainMaterial=new THREE.LineBasicMaterial({color:'#b0c1c9',transparent:true,opacity:.48,depthWrite:false});
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;root.add(rain);
  const rippleGeometry=new THREE.RingGeometry(.7,1,12);
  const rippleMaterial=new THREE.MeshBasicMaterial({color:'#c1d6cb',transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false});
  const ripples=new THREE.InstancedMesh(rippleGeometry,rippleMaterial,100);ripples.frustumCulled=false;root.add(ripples);
  const snowGeometry=new THREE.BufferGeometry();snowGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(drops.length*3),3).setUsage(THREE.DynamicDrawUsage));
  const snowMaterial=new THREE.PointsMaterial({color:'#fafaf0',size:.8,transparent:true,opacity:.8,depthWrite:false});
  const snow=new THREE.Points(snowGeometry,snowMaterial);snow.frustumCulled=false;root.add(snow);
  const dummy=new THREE.Object3D();
  let kind:WeatherSceneKind='clear',elapsed=0,previous:number|undefined;
  function setKind(next:WeatherSceneKind){
    if(kind===next)return;kind=next;root.visible=next!=='clear';rain.visible=ripples.visible=next==='rain';snow.visible=next==='snow';
    for(const bank of banks)bank.top.color.set(next==='rain'?'#d5dfdc':'#f0f1eb');
    clouds.scale.y=next==='cloud'?1.12:1;
  }
  // Keep court surfaces readable through weather, including after rotating the map.
  // Only opacity changes: the clouds and rain retain their world-space positions.
  const projected=new THREE.Vector3();
  function setView(camera:THREE.Camera,zoom:number,courts:THREE.Vector3[]){
    camera.updateMatrixWorld();root.updateMatrixWorld(true);
    const visibleCourts=courts.map(point=>point.clone().project(camera));
    const distanceFade=THREE.MathUtils.lerp(1,.2,THREE.MathUtils.smoothstep(zoom,1.7,6));
    for(const bank of banks){
      let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
      for(const x of [-54,54])for(const z of [-30,30])for(const y of [-8,28]){
        projected.set(x,y,z).applyMatrix4(bank.group.matrixWorld).project(camera);
        left=Math.min(left,projected.x);right=Math.max(right,projected.x);
        top=Math.min(top,projected.y);bottom=Math.max(bottom,projected.y);
      }
      const acrossCourt=visibleCourts.some(p=>p.x>left-.07&&p.x<right+.07&&p.y>top-.1&&p.y<bottom+.1&&p.z>-1&&p.z<1);
      const clearance=acrossCourt?.14:1;
      bank.top.opacity=.64*distanceFade*clearance;
      bank.bottom.opacity=(kind==='rain'?.24:.12)*distanceFade*clearance;
    }
    rainMaterial.opacity=THREE.MathUtils.lerp(.48,.22,THREE.MathUtils.smoothstep(zoom,2,8));
  }
  function animate(seconds:number,running:boolean,windStrength=.18){
    const dt=previous===undefined?0:Math.min(.05,Math.max(0,seconds-previous));previous=seconds;
    if(running)elapsed+=dt;
    if(kind==='clear'||kind==='cloud')return;
    // A stable illustrative wind axis, with measured strength and slow gusts.
    // Anchor each trajectory at its landing point so gusts do not slide ripples.
    const wind=THREE.MathUtils.clamp(Number.isFinite(windStrength)?windStrength:.18,0,.34);
    const drift=(.3+wind*32)*(.86+.14*Math.sin(elapsed*.7));
    const snowPositions=snowGeometry.attributes.position.array as Float32Array;
    drops.forEach((drop,i)=>{
      const phase=(drop.phase+elapsed*drop.speed*(kind==='snow'?.07:.4))%1;
      const y=65*(1-phase)+.4;
      const x=drop.x-(1-phase)*drift,z=drop.z-(1-phase)*drift*.35;
      positions.set([x,y,z,x-drift*drop.length/65,y+drop.length,z-drift*.35*drop.length/65],i*6);
      snowPositions.set([x+Math.sin(elapsed+drop.phase*20)*2,y,z],i*3);
      if(i<100){const scale=.15+phase*1.1;dummy.position.set(drop.x,.4,drop.z);dummy.rotation.x=-Math.PI/2;dummy.scale.setScalar(scale);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);}
    });
    rainGeometry.attributes.position.needsUpdate=true;snowGeometry.attributes.position.needsUpdate=true;ripples.instanceMatrix.needsUpdate=true;
  }
  root.visible=false;setKind('rain');animate(0,false);
  return {root,setKind,setView,animate,dispose(){banks.forEach(bank=>{bank.top.dispose();bank.bottom.dispose();});cloudMap.dispose();cloudMaterial.dispose();underside.dispose();rainGeometry.dispose();rainMaterial.dispose();rippleGeometry.dispose();rippleMaterial.dispose();snowGeometry.dispose();snowMaterial.dispose();}};
}
