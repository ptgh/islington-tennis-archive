import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createAntialiasedBeauty} from '../scene/antialiasedBeauty.ts'

test('scene antialiasing resolves once into ordinary post-processing buffers and follows club switches',()=>{
 const first=new THREE.Scene(),second=new THREE.Scene(),camera=new THREE.OrthographicCamera()
 const pass=createAntialiasedBeauty(first,camera)
 const read=new THREE.WebGLRenderTarget(1600,900),write=read.clone()
 const targets:THREE.WebGLRenderTarget[]=[],draws:THREE.Object3D[]=[]
 const renderer={
  autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:true,
  setRenderTarget(target:THREE.WebGLRenderTarget){targets.push(target)},
  clear(){},render(scene:THREE.Object3D){draws.push(scene)},
 } as unknown as THREE.WebGLRenderer
 pass.setSize(1600,900)
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
 pass.scene=second;pass.setSize(780,1688)
 pass.render(renderer,write,read,0,false)
 assert.equal(draws[2],second)
 assert.equal(multisampled.width,780);assert.equal(multisampled.height,1688)
 let targetReleased=0,copyReleased=0
 multisampled.addEventListener('dispose',()=>targetReleased++)
 resolve.addEventListener('dispose',()=>copyReleased++)
 pass.dispose()
 assert.equal(targetReleased,1);assert.equal(copyReleased,1)
 read.dispose();write.dispose()
})
