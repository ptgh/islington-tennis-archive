import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { orbitMapCamera } from '../scene/mapNavigation.ts';
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
