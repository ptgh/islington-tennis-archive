import * as THREE from 'three'

/** Supersample on capable displays without allocating unbounded retina buffers. */
export function scenePixelRatio(width: number, height: number, deviceRatio: number) {
  const compact = width <= 760
  return Math.min(Math.max(1, deviceRatio), compact ? 2 : 2.5,
    Math.sqrt((compact ? 3200000 : 8500000) / Math.max(1, width * height)))
}

/** Local sky illumination: no HDR downloads or asynchronous scene dependencies. */
export function addSkyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const width = 256, height = 128
  const pixels = new Uint8Array(width * height * 4)
  const sky = new THREE.Color(), top = new THREE.Color('#c6dded')
  const horizon = new THREE.Color('#fff5e4'), ground = new THREE.Color('#68745b')
  for (let y = 0; y < height; y++) {
    const elevation = Math.cos(y / (height - 1) * Math.PI)
    sky.copy(elevation > 0 ? horizon : ground)
    if (elevation > 0) sky.lerp(top, Math.pow(elevation, .55))
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      pixels[offset] = Math.round(sky.r * 255)
      pixels[offset + 1] = Math.round(sky.g * 255)
      pixels[offset + 2] = Math.round(sky.b * 255)
      pixels[offset + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.LinearSRGBColorSpace
  texture.needsUpdate = true
  const generator = new THREE.PMREMGenerator(renderer)
  const target = generator.fromEquirectangular(texture)
  scene.environment = target.texture
  scene.environmentIntensity = .28
  texture.dispose(); generator.dispose()
  return () => { scene.environment = null; target.dispose() }
}