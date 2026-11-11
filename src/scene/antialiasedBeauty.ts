import * as THREE from 'three'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { CopyShader } from 'three/addons/shaders/CopyShader.js'

const MAX_SAMPLE_PIXELS = 8_000_000

/** Multisample scene edges once, then resolve into the composer's ordinary
 * buffers. Use the ordinary beauty pass when the viewport or GPU exceeds the
 * multisample budget. Full-screen AO, grading and lens passes stay single-sample. */
export function createAntialiasedBeauty(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const gl = renderer.getContext() as WebGL2RenderingContext // Three's renderer requires WebGL 2.
  const supported = (format: number) => (gl.getInternalformatParameter(gl.RENDERBUFFER, format, gl.SAMPLES) as Int32Array | null) ?? new Int32Array(0)
  const depthSamples = supported(gl.DEPTH_COMPONENT24)
  const sampleCounts = supported(gl.RGBA16F).filter(count => count > 1 && count <= 4 && depthSamples.includes(count))
  const pass = new RenderPass(scene, camera)
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, resolveDepthBuffer: false })
  target.texture.name = 'Map antialiased beauty'
  const resolve = new ShaderPass(CopyShader)
  resolve.material.depthTest = false
  resolve.material.depthWrite = false
  const draw = pass.render.bind(pass)
  pass.render = (renderer, writeBuffer, readBuffer, delta, mask) => {
    if (!target.samples) {
      draw(renderer, writeBuffer, readBuffer, delta, mask)
      return
    }
    draw(renderer, writeBuffer, target, delta, mask)
    resolve.render(renderer, readBuffer, target, delta, mask)
  }
  pass.dispose = () => { target.dispose(); resolve.dispose() }
  return Object.assign(pass, {
    resize(width: number, height: number, enabled: boolean) {
      width = Math.max(1, Math.floor(width))
      height = Math.max(1, Math.floor(height))
      // WebGL reports supported counts in descending order.
      const samples = enabled ? sampleCounts.find(count => width * height * count <= MAX_SAMPLE_PIXELS) ?? 0 : 0
      if (samples && (width !== target.width || height !== target.height)) target.setSize(width, height)
      else if (samples !== target.samples) target.dispose()
      target.samples = samples
      return samples > 0
    },
  })
}
