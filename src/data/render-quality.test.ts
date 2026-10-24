import test from 'node:test';
import assert from 'node:assert/strict';
import {scenePixelRatio,createAdaptiveResolution,createLensFinish,applyViewFocus,LENS_FINISH} from '../scene/renderQuality.ts';
import {createMiniatureMaterials} from '../scene/miniatureMaterials.ts';

test('render resolution respects phone and desktop pixel budgets',()=>{
 for(const [width,height,device] of [[390,844,3],[1280,900,2],[3840,2160,3],[760,1800,2]]){
  const ratio=scenePixelRatio(width,height,device);
  assert.ok(Number.isFinite(ratio)&&ratio>0);
  assert.ok(width*height*ratio*ratio<=(width<=760?3200000:8500000)+1);
  assert.ok(ratio<=device);
 }
});

test('adaptive resolution rewards sustained headroom and backs off under load',()=>{
 const quality=createAdaptiveResolution();
 let time=1;
 const run=(duration:number,interval:number,submission:number)=>{
  const end=time+duration;
  for(;time<end;time+=interval)quality.sample(time,submission);
 };
 run(4500,1000/60,5);
 assert.equal(quality.scale,1,'brief headroom must not resize buffers');
 run(1500,1000/60,5);
 assert.equal(quality.scale,1.05);
 run(1600,40,20);
 assert.equal(quality.scale,1,'sustained slow frames lower resolution');
 run(30000,40,20);
 assert.equal(quality.scale,.7);
 run(65000,1000/60,5);
 assert.equal(quality.scale,1.15);
 assert.ok(quality.stats.frameMs>0);
});

test('idle, hidden and isolated long gaps cannot drive adaptation',()=>{
 const quality=createAdaptiveResolution();
 for(let i=1;i<=200;i++){
  quality.sample(i*1000,100);
  quality.pause();
 }
 assert.equal(quality.scale,1);
 quality.sample(250000,2000);
 quality.sample(260000,2000);
 assert.equal(quality.scale,1);
});

test('club scheduling uses its existing 30 fps budget without a false downgrade',()=>{
 const quality=createAdaptiveResolution(1000/30);
 for(let i=1;i<300;i++)quality.sample(i*40,15);
 assert.ok(quality.scale>=1);
 const busy=createAdaptiveResolution();
 for(let i=1;i<300;i++)busy.sample(i*20,12);
 assert.equal(busy.scale,1,'hysteresis avoids repeated upgrades and downgrades');
});

test('adaptive pixel budgets stay bounded on phones, desktops and low-DPI screens',()=>{
 assert.equal(scenePixelRatio(1440,900,2,.7),1.4);
 assert.equal(scenePixelRatio(390,844,3,1.15),2.3);
 for(const [width,height,device] of [[390,844,3],[1440,900,2],[3840,2160,3],[1440,900,1]]){
  for(const scale of [.1,.7,1,1.15,5]){
   const ratio=scenePixelRatio(width,height,device,scale);
   assert.ok(ratio>0&&ratio<=device);
   assert.ok(width*height*ratio*ratio<=(width<=760?3200000:8500000)*1.15**2+1);
  }
 }
});

test('quality presets retain their promised detail bounds and switch without rebuilding',()=>{
 const quality=createAdaptiveResolution();
 assert.ok(quality.setPreset('high'));
 assert.equal(quality.scale,1.15);
 for(let i=1;i<=400;i++)quality.sample(i*40,25);
 assert.equal(quality.scale,1,'High preserves at least the original resolution budget');
 assert.ok(quality.setPreset('battery'));
 assert.equal(quality.scale,.8);
 for(let i=1;i<=1000;i++)quality.sample(20000+i*16.667,4);
 assert.equal(quality.scale,.85,'Battery saver cannot grow to a full-size buffer');
 assert.equal(quality.setPreset('battery'),false,'repeat renders must not reset adaptation');
 quality.setPreset('balanced');
 assert.equal(quality.scale,1);
});

test('sharper focus widens the sharp region and restores the original finish exactly',()=>{
 const lens=createLensFinish();
 const saturation=lens.uniforms.saturation.value,grain=lens.uniforms.grain.value;
 applyViewFocus(lens.uniforms,true);
 assert.ok(lens.uniforms.band.value>LENS_FINISH.band);
 assert.ok(lens.uniforms.blur.value<LENS_FINISH.blur);
 assert.equal(lens.uniforms.saturation.value,saturation);
 assert.equal(lens.uniforms.grain.value,grain);
 applyViewFocus(lens.uniforms,false);
 assert.equal(lens.uniforms.band.value,LENS_FINISH.band);
 assert.equal(lens.uniforms.blur.value,LENS_FINISH.blur);
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
test('layered foliage stays deterministic, bounded and within the existing geometry budget',()=>{
 const first=createMiniatureMaterials(),second=createMiniatureMaterials()
 const geometry=first.foliageGeometry,positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal')
 assert.ok(positions.count/3<=336,'richer crowns must not increase per-instance triangle cost')
 assert.ok(first.foliageShadowGeometry.getAttribute('position').count/3<=120,'clustered shadow proxies remain low poly')
 assert.ok(first.shrubGeometry.getAttribute('position').count/3<=80,'garden planting has a separate small geometry budget')
 assert.equal(normals.count,positions.count)
 assert.equal(geometry.getAttribute('uv').count,positions.count)
 assert.equal(geometry.getAttribute('color').count,positions.count)
 for(let i=0;i<positions.count;i++){
  const values=[positions.getX(i),positions.getY(i),positions.getZ(i),normals.getX(i),normals.getY(i),normals.getZ(i)]
  assert.ok(values.every(Number.isFinite))
  assert.ok(Math.max(...values.slice(0,3).map(Math.abs))<1.3,'crown retains its existing planting envelope')
  assert.ok(Math.abs(Math.hypot(...values.slice(3))-1)<1e-5)
 }
 assert.deepEqual(positions.array,second.foliageGeometry.getAttribute('position').array)
 let released=0;geometry.addEventListener('dispose',()=>released++)
 first.dispose();first.dispose();second.dispose()
 assert.equal(released,1)
});
test('lens finish keeps a sharp centre band and soft tilt-shift edges',async()=>{
 const {createLensFinish,LENS_FINISH}=await import('../scene/renderQuality.ts');
 const lens=createLensFinish();
 assert.ok(LENS_FINISH.band>0&&LENS_FINISH.band<.5);
 assert.ok(lens.uniforms.blur.value>0&&lens.uniforms.vignette.value<.5);
});
