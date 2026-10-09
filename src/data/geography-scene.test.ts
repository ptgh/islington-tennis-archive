import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {busRoutes} from './busRoutes.ts';
import {highburyCourts,renderedHighburyCourts,projectPoint,inCourtArea} from '../scene/courtGeometry.ts';
import {createCourtLighting} from '../scene/createCourtLighting.ts';

test('Highbury has eleven regulation-scale courts and no traffic route enters their enclosures',()=>{
 assert.equal(highburyCourts.length,11);
 const areas=highburyCourts.map(c=>{
  // One world unit is approximately ten metres.
  assert.ok(c.width>.9&&c.width<1.3);
  assert.ok(c.depth>2&&c.depth<2.6);
  return {x:c.x,z:c.z,halfWidth:c.width*.75,halfDepth:c.depth*.68,rotation:c.rotation};
 });
 for(const route of busRoutes){
  const points=route.points.map(([lng,lat])=>projectPoint(lng,lat));
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.1);
   for(let n=0;n<=steps;n++)assert.equal(inCourtArea(a[0]+(b[0]-a[0])*n/steps,a[1]+(b[1]-a[1])*n/steps,areas,.9),false,`Route ${route.id} must clear courts and vehicle overhang`);
  }
 }
});

test('floodlight glow switches with night mode and keeps lamps in fixed world positions',()=>{
 const lighting=createCourtLighting();lighting.add(12,34,3,4,Math.PI/6,.24);
 const before=lighting.root.children.map(c=>c.position.toArray());
 const halos:THREE.Sprite[]=[];lighting.root.traverse(o=>{if(o instanceof THREE.Sprite)halos.push(o);});
 assert.equal(halos.length,4);
 const visible=()=>{let count=0;lighting.root.traverseVisible(o=>{if(o instanceof THREE.Sprite)count++;});return count;};
 assert.equal(visible(),0);lighting.setNight(true);assert.equal(visible(),4);
 assert.deepEqual(lighting.root.children.map(c=>c.position.toArray()),before);
 lighting.setNight(false);assert.equal(visible(),0);lighting.dispose();
});


test('displayed Highbury courts are legible miniatures and all traffic clears their enlarged footprints',()=>{
 assert.equal(renderedHighburyCourts.length,11);
 const areas=renderedHighburyCourts.map(c=>{
  assert.ok(c.width>4&&c.width<6,'court width stays comparable to the other 5.3-unit miniature courts');
  return {x:c.x,z:c.z,halfWidth:c.width*.75,halfDepth:c.depth*.68,rotation:c.rotation};
 });
 for(const route of busRoutes){
  const points=route.points.map(([lng,lat])=>projectPoint(lng,lat));
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.1);
   for(let n=0;n<=steps;n++)assert.equal(inCourtArea(a[0]+(b[0]-a[0])*n/steps,a[1]+(b[1]-a[1])*n/steps,areas,.9),false,`Route ${route.id} must clear the displayed courts too`);
  }
 }
});
