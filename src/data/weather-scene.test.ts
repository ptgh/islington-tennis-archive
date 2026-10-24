import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWeather} from '../scene/createWeather.ts';
import {weatherWind,lightCycle} from '../scene/sceneAtmosphere.ts';
import {DEFAULT_VIEW_SETTINGS} from './viewQuality.ts';

test('High is the default and forecast wind controls bounded tree sway',()=>{
 assert.equal(DEFAULT_VIEW_SETTINGS.preset,'high');
 assert.ok(weatherWind('rain',18)>weatherWind('rain',3));
 assert.ok(weatherWind('cloud',100)<=.34);
 assert.ok(weatherWind('rain',0)<weatherWind('clear'));
 const date=new Date('2026-06-21T12:00:00Z');
 assert.ok(lightCycle(date,false,'rain').direct<lightCycle(date,false,'clear').direct*.2,'rain lighting is predominantly diffuse');
});

test('clouds use owned soft density maps with shaded cores and transparent edges',()=>{
 const weather=createWeather(),clouds=weather.root.children[0];
 const sprite=clouds.children[0].children[0] as THREE.Sprite;
 assert.ok(sprite.isSprite);
 const map=(sprite.material as THREE.SpriteMaterial).map!;
 const data=map.image.data as Uint8Array,alpha=Array.from(data).filter((_,i)=>i%4===3);
 assert.ok(alpha.includes(0)&&alpha.some(a=>a>150)&&alpha.some(a=>a>0&&a<80));
 let disposed=0;map.addEventListener('dispose',()=>disposed++);weather.dispose();assert.equal(disposed,1);
});
test('cloud footprints stay fixed while rain animates and pausing freezes drops',()=>{
 const weather=createWeather();
 try{
  const clouds=weather.root.children[0];
  const footprints=clouds.children.map(c=>c.position.toArray());
  const rain=weather.root.children.find(c=>c instanceof THREE.LineSegments) as THREE.LineSegments;
  const before=Array.from(rain.geometry.attributes.position.array);
  weather.animate(1,true);
  const after=Array.from(rain.geometry.attributes.position.array);
  assert.notDeepEqual(after,before);
  assert.deepEqual(clouds.children.map(c=>c.position.toArray()),footprints);
  weather.animate(2,false);assert.deepEqual(Array.from(rain.geometry.attributes.position.array),after);
  weather.setKind('cloud');assert.equal(rain.visible,false);assert.equal(weather.root.visible,true);
  weather.setKind('clear');assert.equal(weather.root.visible,false);
 }finally{weather.dispose();}
});

test('wind steepens rain trajectories without moving their ground anchors',()=>{
 const weather=createWeather();
 try{
  const rain=weather.root.children.find(c=>c instanceof THREE.LineSegments) as THREE.LineSegments;
  const ripples=weather.root.children.find(c=>c instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
  weather.animate(1,false,.02);
  const calm=Array.from(rain.geometry.attributes.position.array),anchors=Array.from(ripples.instanceMatrix.array);
  weather.animate(2,false,.3);
  const windy=Array.from(rain.geometry.attributes.position.array);
  assert.ok(Math.abs(windy[3]-windy[0])>Math.abs(calm[3]-calm[0])*3,'strong wind visibly slants each streak');
  assert.equal(windy[1],calm[1],'changing wind while paused does not advance falling drops');
  assert.deepEqual(Array.from(ripples.instanceMatrix.array),anchors,'ripples retain their ground contact points');
  assert.ok(windy.every(Number.isFinite));
  weather.animate(3,false,NaN);
  assert.ok(Array.from(rain.geometry.attributes.position.array).every(Number.isFinite));
 }finally{weather.dispose();}
});
