import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {stationEntrances,stationArrival} from './stationEntrances.ts';
import {boroughGeography,containsPoint,type BoroughCell} from '../scene/boroughGeometry.ts';
import {createBoroughMaterials,createBoroughTile} from '../scene/createBoroughTile.ts';
import {roofDetailSites} from '../scene/boroughRoofDetails.ts';
import {destinationLabelHeight} from '../scene/destinationHighlight.ts';
const source=(id:string):BoroughCell=>JSON.parse(fs.readFileSync('public/'+boroughGeography.cells.find(c=>c.id===id)!.url,'utf8'));

test('station street arrivals match source hosts and outward facade signs; cells release their own geometry',()=>{
 const materials=createBoroughMaterials();let sharedReleased=0;
 for(const sign of materials.stationSigns.values())sign.addEventListener('dispose',()=>sharedReleased++);
 try{for(const [i,id] of ['1_4','1_7','6_0','1_0','0_-2'].entries()){
  const entry=stationEntrances[i],data=source(id),host=data.buildings.find(f=>Number(f.id)===entry.building)!;
  assert.ok(host);const before=JSON.stringify(data),a=host.points[entry.edge],b=host.points[entry.edge+1],dx=b[0]-a[0],dz=b[1]-a[1];
  const signed=host.points.slice(1).reduce((sum,q,i)=>sum+host.points[i][0]*q[1]-q[0]*host.points[i][1],0),sign=signed>0?1:-1;
  assert.ok(Math.abs(Math.sin(entry.facing)-dz/Math.hypot(dx,dz)*sign)<1e-8);assert.ok(Math.abs(Math.cos(entry.facing)+dx/Math.hypot(dx,dz)*sign)<1e-8);
  const x=(entry.lng+.115)*6900,z=-(entry.lat-51.549)*11100,t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  assert.ok(Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<.17,'entrance no longer matches stored facade');
  const tile=createBoroughTile(data,materials,undefined,id);
  try{
   assert.equal(tile.root.userData.coverage.stationEntrances,1);
   const name=tile.root.children.find(o=>o instanceof THREE.Mesh&&o.material===materials.stationSigns.get(entry.name)) as THREE.Mesh;
   assert.ok(name);const p=name.geometry.getAttribute('position'),n=name.geometry.getAttribute('normal');
   for(let j=0;j<p.count;j++){assert.ok(Math.abs(p.getY(j)-.39)<.06);assert.ok(Math.abs(n.getX(j)-Math.sin(entry.facing))<1e-5&&Math.abs(n.getZ(j)-Math.cos(entry.facing))<1e-5);}
   assert.ok(Array.from(p.array).every(Number.isFinite));assert.equal(JSON.stringify(data),before);
   if('canopy' in entry){
    const canopy=data.buildings.find(f=>Number(f.id)===entry.canopy)!;
    assert.equal(canopy.tags?.building,'roof');
    const shelter=createBoroughTile({buildings:[canopy],roads:[],water:[],parks:[],trees:[],railways:[]},materials);
    try{const bounds=new THREE.Box3().setFromObject(shelter.root);assert.ok(bounds.max.y<.36,'canopy hides the entrance fascia');const roof=shelter.root.children.find(o=>o instanceof THREE.Mesh&&!(o instanceof THREE.InstancedMesh)) as THREE.Mesh;assert.ok(roof);assert.ok(roof.geometry.getAttribute('position').getY(0)>.33,'roof was extruded to the ground');}finally{shelter.dispose();}
   }
   const arrival=stationArrival(entry.name,0,0);assert.deepEqual(arrival,{lat:entry.lat,lng:entry.lng,zoom:45});assert.ok(destinationLabelHeight({...entry,...arrival})>.7);
   let disposed=false;name.geometry.addEventListener('dispose',()=>disposed=true);tile.dispose();assert.ok(disposed);assert.equal(sharedReleased,0);
  }catch(error){tile.dispose();throw error;}
 }}finally{materials.dispose();}
 assert.equal(sharedReleased,stationEntrances.length);assert.deepEqual(stationArrival('Unverified station',51,-.1,18),{lat:51,lng:-.1,zoom:18});
});

test('roof detail clearance respects concave outlines, courtyard holes and cell budgets',()=>{
 const hole=[[2,2],[4,2],[4,4],[2,4],[2,2]],f={id:11,points:[[0,0],[6,0],[6,2],[4,2],[4,6],[0,6],[0,0]],holes:[hole]};
 const sites=roofDetailSites(f);assert.ok(sites.length>0&&sites.length<=2);
 for(const site of sites)for(let i=0;i<64;i++){
  const x=site.x+Math.cos(i*Math.PI/32)*.429,z=site.z+Math.sin(i*Math.PI/32)*.429;
  assert.ok(containsPoint(x,z,f.points));assert.ok(!containsPoint(x,z,hole));
 }
 const materials=createBoroughMaterials();
 try{for(const id of ['1_4','1_7','6_0']){
  const tile=createBoroughTile(source(id),materials,undefined,id);try{assert.ok(tile.root.userData.coverage.illustrativeRoofDetails>0&&tile.root.userData.coverage.illustrativeRoofDetails<=24);assert.ok(tile.root.userData.coverage.illustrativeNests<=2);}finally{tile.dispose();}
 }}finally{materials.dispose();}
});
