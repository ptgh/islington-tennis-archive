import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createBoroughMaterials,createBoroughTile} from '../scene/createBoroughTile.ts';
import {buildingHeight,containsPoint,type BoroughCell} from '../scene/boroughGeometry.ts';
import {createBoroughLifeAssets,createBoroughLife} from '../scene/createBoroughLife.ts';
import {destinationOutline,destinationLabelHeight} from '../scene/destinationHighlight.ts';
import {londonArtworks,londonMasts,londonStreetNames} from './londonDetails.ts';
import {places} from './places.ts';
const files=fs.readdirSync('public/map/islington').filter(p=>p.endsWith('.json'));
const cells=files.map(p=>({id:p.replace(/-[a-f0-9]+\.json$/,''),data:JSON.parse(fs.readFileSync('public/map/islington/'+p,'utf8')) as BoroughCell}));
for(const id of [-72165470,4256246,4680891,107005576,5022282])test(`London landmark ${id} preserves the source ring and owns finite bounded geometry`,()=>{
 const f=cells.flatMap(c=>c.data.buildings).find(f=>Number(f.id)===id)!;const original=JSON.stringify(f),m=createBoroughMaterials();
 const tile=createBoroughTile({buildings:[f],roads:[],parks:[],trees:[],water:[],railways:[]},m);
 try{
  const wall=tile.root.children.find(o=>o.name===(id===107005576||id===5022282?'Barbican concrete':'London landmark masonry')) as THREE.Mesh;
  assert.ok(wall?.castShadow);const p=wall.geometry.getAttribute('position');
  for(const [x,z] of f.points)assert.ok(Array.from({length:p.count},(_,i)=>i).some(i=>Math.abs(p.getX(i)-x)<.00003&&Math.abs(p.getZ(i)-z)<.00003&&Math.abs(p.getY(i)-.012)<.00001),'mapped base vertex missing');
  tile.root.traverse(o=>{if(o instanceof THREE.Mesh)assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));});
  const bounds=new THREE.Box3().setFromObject(tile.root);assert.ok(bounds.max.y<buildingHeight(f.tags,f.points)+.15,'architectural crown exceeds its envelope');
  const place=places.find(p=>Number(p.sourceWay)===id)!;assert.ok(destinationLabelHeight(place)>bounds.max.y,'destination label covers its landmark crown');
  if(id===-72165470||id===4256246){
   let rooflightVertices=0;
   tile.root.traverse(o=>{if(o instanceof THREE.Mesh&&!(o instanceof THREE.InstancedMesh)&&o.material===m.glass){const p=o.geometry.getAttribute('position'),n=o.geometry.getAttribute('normal');for(let i=0;i<p.count;i++)if(n.getY(i)>.9){rooflightVertices++;assert.ok(containsPoint(p.getX(i),p.getZ(i),f.points));assert.ok(!f.holes?.some(h=>containsPoint(p.getX(i),p.getZ(i),h)));}}});
   assert.ok(rooflightVertices>0,'station roof has no upward-facing glazing');
  }
  assert.equal(JSON.stringify(f),original);let disposed=false;wall.geometry.addEventListener('dispose',()=>disposed=true);tile.dispose();assert.ok(disposed);
 }finally{m.dispose();}
});
test('detail records match stored roof hosts, road ways and unique artwork cells',()=>{
 for(const mast of londonMasts){const f=cells.flatMap(c=>c.data.buildings).find(f=>Number(f.id)===mast.buildingId)!;assert.ok(f);assert.ok(containsPoint((mast.lng+.115)*6900,-(mast.lat-51.549)*11100,f.points));}
 const roads=new Set(cells.flatMap(c=>c.data.roads.map(r=>String(r.id).split(':')[0])));
 for(const street of londonStreetNames)assert.ok(roads.has(String(street.id)));
 for(const art of londonArtworks){const x=(art.lng+.115)*6900,z=-(art.lat-51.549)*11100;assert.equal(cells.filter(c=>c.id===`${Math.floor(x/40)}_${Math.floor(z/40)}`).length,1);}
});
test('black cab overlays and walking officers inherit accepted poses and pause with their original routes',()=>{
 const assets=createBoroughLifeAssets();let cabs=0,officers=0;
 try{
  assets.geometry.taxi.computeBoundingBox();const bounds=assets.geometry.taxi.boundingBox!;assert.ok(bounds.min.x>=-.103&&bounds.max.x<=.103&&bounds.min.z>=-.2&&bounds.max.z<=.2);
  for(const cell of cells.filter(c=>['-2_4','-2_5','-3_5','1_-1'].includes(c.id))){
   const life=createBoroughLife(cell.data,assets);try{
    life.animate(.3,true,true);const car=life.root.getObjectByName('Borough car') as THREE.InstancedMesh,taxi=life.root.getObjectByName('Borough taxi') as THREE.InstancedMesh,person=life.root.getObjectByName('Borough person') as THREE.InstancedMesh,officer=life.root.getObjectByName('Borough officer') as THREE.InstancedMesh,a=new THREE.Matrix4(),b=new THREE.Matrix4();
    for(const [overlay,base] of [[taxi,car],[officer,person]])if(overlay)for(let i=0;i<overlay.count;i++){overlay.getMatrixAt(i,a);if(a.elements[15]!==1)continue;base.getMatrixAt(i,b);assert.deepEqual(a.elements,b.elements);if(overlay===taxi)cabs++;else officers++;}
    const before=[taxi,officer].filter(Boolean).map(m=>Array.from(m.instanceMatrix.array));life.animate(10,false,false);for(const [i,m]of [taxi,officer].filter(Boolean).entries())assert.deepEqual(Array.from(m.instanceMatrix.array),before[i]);
   }finally{life.dispose();}
  }
  assert.ok(cabs>0);assert.ok(officers>0);
 }finally{assets.dispose();}
});

test('public art builds once in its source cell, and roadside plates stay bounded',()=>{
 const materials=createBoroughMaterials();let artworks=0,masts=0,signs=0;
 try{for(const cell of cells.filter(c=>['-2_4','-2_5','-3_4','-3_5'].includes(c.id))){
  const tile=createBoroughTile(cell.data,materials,undefined,cell.id);
  try{const details=tile.root.userData.coverage.londonDetails;artworks+=details.artworks;masts+=details.masts;signs+=details.streetNames;assert.ok(details.streetNames<=5);}finally{tile.dispose();}
 }assert.equal(artworks,2);assert.equal(masts,2);assert.ok(signs>0);}finally{materials.dispose();}
});
test('King’s Cross selection stays at its eaves instead of floating at the clock crown',()=>{
 const f=cells.flatMap(c=>c.data.buildings).find(f=>Number(f.id)===-72165470)!;
 const outline=destinationOutline(f);try{outline.computeBoundingBox();assert.ok(Math.abs(outline.boundingBox!.max.y-(buildingHeight(f.tags,f.points)*.36+.04))<.00001);}finally{outline.dispose();}
});
