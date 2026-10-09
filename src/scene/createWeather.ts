import * as THREE from 'three';
export type WeatherSceneKind = 'clear' | 'cloud' | 'rain' | 'snow';

/** Fixed world positions: camera gestures never change the weather's ground footprint. */
export function createWeather() {
  const root = new THREE.Group();
  root.name = 'Neighbourhood weather';
  const clouds = new THREE.Group();
  root.add(clouds);
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const cloudMaterial = new THREE.MeshStandardMaterial({color:'#dce3d9',roughness:1,transparent:true,opacity:.48,depthWrite:false});
  const underside = new THREE.MeshStandardMaterial({color:'#839897',roughness:1,transparent:true,opacity:.24,depthWrite:false});
  // Low rain banks, rounded cumulus crowns and smaller wisps share the town's modelled style.
  const cells = [{x:90,z:-120,s:1},{x:-140,z:60,s:.9},{x:190,z:180,s:.85},{x:-70,z:-300,s:1.1},{x:35,z:340,s:.85}];
  const lobes = [[-26,0,0,25,8,15],[-8,8,-5,22,16,17],[16,5,1,24,12,17],[35,0,1,17,7,12],[-10,-5,0,38,5,16],[-12,1,12,19,9,11],[13,0,-13,17,7,12]];
  const banks:{group:THREE.Group;top:THREE.MeshStandardMaterial;bottom:THREE.MeshStandardMaterial}[]=[];
  for(const cell of cells){
    const group=new THREE.Group();group.position.set(cell.x,74,cell.z);group.scale.setScalar(cell.s);
    const top=cloudMaterial.clone(),bottom=underside.clone();banks.push({group,top,bottom});
    lobes.forEach(([x,y,z,sx,sy,sz],i)=>{const mesh=new THREE.Mesh(geometry,i===4?bottom:top);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);});
    clouds.add(group);
  }
  let seed=72;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const drops=Array.from({length:1600},(_,i)=>{const c=cells[i%cells.length];return {x:c.x+(random()-.5)*88*c.s,z:c.z+(random()-.5)*43*c.s,phase:random(),speed:.65+random()*.5,length:3.5+random()*3};});
  const positions=new Float32Array(drops.length*6);
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const rainMaterial=new THREE.LineBasicMaterial({color:'#6d99ac',transparent:true,opacity:.48,depthWrite:false});
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
      bank.top.opacity=.48*distanceFade*clearance;
      bank.bottom.opacity=(kind==='rain'?.24:.12)*distanceFade*clearance;
    }
    rainMaterial.opacity=THREE.MathUtils.lerp(.48,.22,THREE.MathUtils.smoothstep(zoom,2,8));
  }
  function animate(seconds:number,running:boolean){
    const dt=previous===undefined?0:Math.min(.05,Math.max(0,seconds-previous));previous=seconds;
    if(running)elapsed+=dt;
    if(kind==='clear'||kind==='cloud')return;
    const snowPositions=snowGeometry.attributes.position.array as Float32Array;
    drops.forEach((drop,i)=>{
      const phase=(drop.phase+elapsed*drop.speed*(kind==='snow'?.07:.4))%1;
      const y=65*(1-phase)+.4;
      const x=drop.x+phase*4;
      positions.set([x,y,drop.z,x-.17,y+drop.length,drop.z],i*6);
      snowPositions.set([drop.x+Math.sin(elapsed+drop.phase*20)*2,y,drop.z],i*3);
      if(i<100){const scale=.15+phase*1.1;dummy.position.set(drop.x+4,.4,drop.z);dummy.rotation.x=-Math.PI/2;dummy.scale.setScalar(scale);dummy.updateMatrix();ripples.setMatrixAt(i,dummy.matrix);}
    });
    rainGeometry.attributes.position.needsUpdate=true;snowGeometry.attributes.position.needsUpdate=true;ripples.instanceMatrix.needsUpdate=true;
  }
  root.visible=false;setKind('rain');animate(0,false);
  return {root,setKind,setView,animate,dispose(){banks.forEach(bank=>{bank.top.dispose();bank.bottom.dispose();});geometry.dispose();cloudMaterial.dispose();underside.dispose();rainGeometry.dispose();rainMaterial.dispose();rippleGeometry.dispose();rippleMaterial.dispose();snowGeometry.dispose();snowMaterial.dispose();}};
}
