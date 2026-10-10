import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGear} from '../scene/createGear.ts';
import {busRoutes} from './busRoutes.ts';
import {venues} from './venues.ts';
import {busRouteLine,courtAreas} from '../scene/courtGeometry.ts';

test('van stays on the rendered route through a full return journey and pauses in place',()=>{
 const project=(lat:number,lng:number)=>new THREE.Vector3((lng+.115)*6900,0,-(lat-51.549)*11100);
 const areas=courtAreas(venues),gear=createGear(project,areas);
 // The rendered road is the shared bus line (around Highbury Fields and courts), not the raw route.
 const road=busRouteLine(busRoutes.find(r=>r.id==='19')!.points.map(([lng,lat]):[number,number]=>{const p=project(lat,lng);return [p.x,p.z];}),areas).map(([x,z])=>new THREE.Vector3(x,0,z));
 const line=new THREE.Line3(),closest=new THREE.Vector3();
 for(let frame=0;frame<4000;frame++){
  gear.animate(.1,true);
  const distance=Math.min(...road.slice(1).map((p,i)=>{line.set(road[i],p).closestPointToPoint(gear.van.position,true,closest);return closest.distanceTo(gear.van.position);}));
  assert.ok(distance<.00001,'van must share a rendered road centreline');
 }
 const paused=gear.van.position.clone();gear.animate(10,false);
 assert.ok(paused.equals(gear.van.position));
});
