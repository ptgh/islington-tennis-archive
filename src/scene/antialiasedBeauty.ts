import * as THREE from 'three'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { CopyShader } from 'three/addons/shaders/CopyShader.js'

/** Multisample scene edges once, then resolve into the composer's ordinary
 * buffers. Full-screen AO, grading and lens passes do not need MSAA. */
export function createAntialiasedBeauty(scene: THREE.Scene, camera: THREE.Camera) {
  const pass = new RenderPass(scene, camera)
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  target.texture.name = 'Club antialiased beauty'
  const resolve = new ShaderPass(CopyShader)
  resolve.material.depthTest = false
  resolve.material.depthWrite = false
  const draw = pass.render.bind(pass)
  pass.render = (renderer, writeBuffer, readBuffer, delta, mask) => {
    draw(renderer, writeBuffer, target, delta, mask)
    resolve.render(renderer, readBuffer, target, delta, mask)
  }
  pass.setSize = (width, height) => target.setSize(width, height)
  pass.dispose = () => { target.dispose(); resolve.dispose() }
  return pass
}
