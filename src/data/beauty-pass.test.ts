import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createAntialiasedBeauty} from '../scene/antialiasedBeauty.ts'

test('scene antialiasing resolves once into ordinary post-processing buffers and follows club switches',()=>{
 const first=new THREE.Scene(),second=new THREE.Scene(),camera=new THREE.OrthographicCamera()
 const read=new THREE.WebGLRenderTarget(1600,900),write=read.clone()
 const targets:THREE.WebGLRenderTarget[]=[],draws:THREE.Object3D[]=[]
 const gl={
  RENDERBUFFER:1,RGBA16F:2,DEPTH_COMPONENT24:3,SAMPLES:4,
  getInternalformatParameter:()=>new Int32Array([4,2]),
 }
 const renderer={
  autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:true,
  getContext:()=>gl,
  setRenderTarget(target:THREE.WebGLRenderTarget){targets.push(target)},
  clear(){},render(scene:THREE.Object3D){draws.push(scene)},
 } as unknown as THREE.WebGLRenderer
 const pass=createAntialiasedBeauty(renderer,first,camera)
 assert.equal(pass.resize(1600,900,true),true)
 pass.render(renderer,write,read,0,false)
 const multisampled=targets[0],resolve=(draws[1] as THREE.Mesh).material as THREE.ShaderMaterial
 assert.equal(multisampled.samples,4)
 assert.equal(multisampled.texture.type,THREE.HalfFloatType)
 assert.equal(multisampled.width,1600);assert.equal(multisampled.height,900)
 assert.equal(targets[1],read);assert.equal(read.samples,0);assert.equal(write.samples,0)
 assert.equal(resolve.uniforms.tDiffuse.value,multisampled.texture)
 assert.equal(resolve.depthTest,false);assert.equal(resolve.depthWrite,false)
 assert.equal(draws[0],first)
 assert.equal(renderer.autoClear,true,'scene draw restores the renderer state')
 pass.scene=second;pass.resize(780,1688,true)
 pass.render(renderer,write,read,0,false)
 assert.equal(draws[2],second)
 assert.equal(multisampled.width,780);assert.equal(multisampled.height,1688)
 assert.equal(pass.resize(2200,1100,true),true)
 assert.equal(multisampled.samples,2,'use fewer samples when four exceed the budget')
 for(const [width,height,enabled] of [[3200,1800,true],[1600,900,false]] as const){
  assert.equal(pass.resize(width,height,enabled),false)
  const previousDraws=draws.length
  pass.render(renderer,write,read,0,false)
  assert.equal(draws.length,previousDraws+1,'fallback draws directly without a resolve')
  assert.equal(targets.at(-1),read)
 }
 let targetReleased=0,copyReleased=0
 multisampled.addEventListener('dispose',()=>targetReleased++)
 resolve.addEventListener('dispose',()=>copyReleased++)
 pass.dispose()
 assert.equal(targetReleased,1);assert.equal(copyReleased,1)
 read.dispose();write.dispose()
})
