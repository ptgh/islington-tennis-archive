import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWeather} from '../scene/createWeather.ts';
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
