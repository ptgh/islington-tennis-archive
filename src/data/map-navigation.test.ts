import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { orbitMapCamera,flightPlan,flightZoom,wheelBelongsToMap } from '../scene/mapNavigation.ts';
import { supportsBusTour } from './busRoutes.ts';

test('map orbit preserves geographic focus, distance and zoom and clamps tilt',()=>{
 const camera=new THREE.OrthographicCamera(-10,10,10,-10,1,1000),target=new THREE.Vector3(35,0,-62);
 camera.position.copy(target).add(new THREE.Vector3(20,40,50));camera.zoom=3;
 const distance=camera.position.distanceTo(target),original=target.clone();
 orbitMapCamera(camera,target,.2,1.2,.5,10);
 const orbit=new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
 assert.ok(Math.abs(orbit.phi-1.2)<1e-10);
 assert.ok(Math.abs(camera.position.distanceTo(target)-distance)<1e-10);
 assert.deepEqual(target,original);assert.equal(camera.zoom,3);
 orbitMapCamera(camera,target,.2,1.2,0,-10);
 assert.ok(Math.abs(new THREE.Spherical().setFromVector3(camera.position.clone().sub(target)).phi-.2)<1e-10);
});
test('tour actions are limited to routes with stored road geometry',()=>{
 for(const id of ['19','30','43','393'])assert.equal(supportsBusTour(id),true);
 for(const id of ['139','unknown','__proto__'])assert.equal(supportsBusTour(id),false);
});

test('short trips stay low, long trips rise to the overview, and the flight ends exactly on target',()=>{
 const near=flightPlan(30,6,8,672,.86),far=flightPlan(350,6,18,672,.86)
 assert.equal(near.cruise,null);assert.ok(far.cruise!==null&&far.cruise<=4.2)
 assert.ok(far.duration>near.duration&&near.duration>=1700&&far.duration<=2600)
 assert.ok(Math.abs(flightZoom(6,18,far.cruise,0)-6)<1e-9);assert.ok(Math.abs(flightZoom(6,18,far.cruise,1)-18)<1e-9)
 assert.ok(Math.abs(flightZoom(6,18,far.cruise,.5)-far.cruise!)<1e-9,'the midpoint is the cruising height')
 assert.ok(Math.abs(flightZoom(6,18,null,.5)-Math.sqrt(6*18))<1e-9,'zoom moves evenly in scale')
})

test('gestures over pins and floating buttons reach the map, while panels keep their own',()=>{
 const inside=(...selectors:string[])=>({closest:(query:string)=>selectors.some(s=>query.split(',').includes(s))||null})
 assert.equal(wheelBelongsToMap(inside('.town-map'),true),true,'a pinch on a court label zooms the map')
 assert.equal(wheelBelongsToMap(inside('.town-map'),false),true,'scrolling across a label keeps zooming')
 assert.equal(wheelBelongsToMap(inside('.pill'),true),true,'a pinch on a floating button zooms the map')
 assert.equal(wheelBelongsToMap(inside('.pill'),false),false,'a plain scroll on a button is left alone')
 assert.equal(wheelBelongsToMap(inside('.directory-panel','.pill'),true),false,'the hub keeps the browser pinch-zoom')
 assert.equal(wheelBelongsToMap(inside('dialog','.pill'),true),false)
})

