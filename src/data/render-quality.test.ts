import test from 'node:test';
import assert from 'node:assert/strict';
import {scenePixelRatio} from '../scene/renderQuality.ts';
import {createMiniatureMaterials} from '../scene/miniatureMaterials.ts';

test('render resolution respects phone and desktop pixel budgets',()=>{
 for(const [width,height,device] of [[390,844,3],[1280,900,2],[3840,2160,3],[760,1800,2]]){
  const ratio=scenePixelRatio(width,height,device);
  assert.ok(Number.isFinite(ratio)&&ratio>0);
  assert.ok(width*height*ratio*ratio<=(width<=760?3200000:8500000)+1);
  assert.ok(ratio<=device);
 }
});

test('miniature surfaces include repeatable relief and see-through netting',()=>{
 const finishes=createMiniatureMaterials();
 assert.ok(finishes.hardCourt.map&&finishes.hardCourt.bumpMap);
 assert.ok(finishes.grass.bumpMap&&finishes.ballast.bumpMap);
 assert.ok(finishes.timber.map);
 assert.ok(finishes.net.alphaMap&&finishes.net.alphaTest>0);
 const data=finishes.net.alphaMap.image.data;
 assert.ok(data.includes(0)&&data.includes(255));
 finishes.dispose();finishes.dispose();
});
test('lens finish keeps a sharp centre band and soft tilt-shift edges',async()=>{
 const {createLensFinish,LENS_FINISH}=await import('../scene/renderQuality.ts');
 const lens=createLensFinish();
 assert.ok(LENS_FINISH.band>0&&LENS_FINISH.band<.5);
 assert.ok(lens.uniforms.blur.value>0&&lens.uniforms.vignette.value<.5);
});
