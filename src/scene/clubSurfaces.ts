import * as THREE from 'three'
import grassColor from '../assets/court-surfaces/grass-color.jpg.asset.json' with { type: 'json' }
import grassNormal from '../assets/court-surfaces/grass-normal.jpg.asset.json' with { type: 'json' }
import grassRough from '../assets/court-surfaces/grass-roughness.jpg.asset.json' with { type: 'json' }
import concreteColor from '../assets/court-surfaces/weathered-concrete-color.jpg.asset.json' with { type: 'json' }
import concreteNormal from '../assets/court-surfaces/weathered-concrete-normal.jpg.asset.json' with { type: 'json' }
import concreteRough from '../assets/court-surfaces/weathered-concrete-roughness.jpg.asset.json' with { type: 'json' }
import syntheticColor from '../assets/court-surfaces/synthetic-color.jpg.asset.json' with { type: 'json' }
import syntheticNormal from '../assets/court-surfaces/synthetic-normal.jpg.asset.json' with { type: 'json' }
import syntheticRough from '../assets/court-surfaces/synthetic-roughness.jpg.asset.json' with { type: 'json' }

export type ClubCourtSurface = 'grass' | 'synthetic' | 'concrete' | 'clay'
/** Town listings use prose; do not turn unpublished or mixed surfaces into grass. */
export function townCourtSurface(recorded?: string): ClubCourtSurface {
  const surface = recorded?.toLowerCase().trim() ?? ''
  if (surface === 'grass') return 'grass'
  if (surface === 'concrete') return 'concrete'
  if (surface === 'clay' || surface === 'artificial clay') return 'clay'
  return 'synthetic'
}

/** THREE clones do not copy custom shader hooks; preserve the wear treatment. */
export function cloneCourtFinish(material: THREE.MeshStandardMaterial) {
  const copy = material.clone()
  copy.onBeforeCompile = material.onBeforeCompile
  copy.customProgramCacheKey = material.customProgramCacheKey
  return copy
}

/** Consistent diamond size on both short and long fence runs. */
export function courtFenceGeometry(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height)
  const uv = geometry.getAttribute('uv')
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width / 8, uv.getY(i) * height / 1.6)
  return geometry
}
export function clubCourtSurface(recorded?: string): ClubCourtSurface {
  if (recorded === 'clay') return 'clay'
  if (recorded === 'concrete') return 'concrete'
  if (['asphalt', 'acrylic', 'hard', 'artificial_grass', 'synthetic'].includes(recorded ?? '')) return 'synthetic'
  // Keep the existing grass illustration where the mapped surface is unknown.
  return 'grass'
}

/** Scanned CC0 surfaces, with immediate procedural fallbacks and owned cleanup. */
export function createClubSurfaces(fallback: THREE.MeshStandardMaterial, invalidate: () => void = () => {}) {
  const textures: THREE.Texture[] = []
  const materials: THREE.MeshStandardMaterial[] = []
  const loader = typeof document === 'undefined' ? undefined : new THREE.TextureLoader()
  let disposed = false
  const map = (url: string, repeat: [number, number], color: boolean) => {
    // Image-backed Texture is required here: DataTexture uploads expect raw
    // byte buffers and cannot be repurposed by assigning an HTMLImageElement.
    const texture = new THREE.Texture()
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2
      const context = canvas.getContext('2d')
      if (context) { context.fillStyle = color ? '#c1c1c1' : '#8080ff'; context.fillRect(0, 0, 2, 2); texture.image = canvas }
    }
    texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(...repeat); texture.anisotropy = 8
    texture.needsUpdate = true
    textures.push(texture)
    loader?.load(url, loaded => {
      if (!disposed) {
        // Immutable GPU storage must be released before replacing the 2px
        // fallback with a differently sized photographic image.
        texture.dispose(); texture.image = loaded.image; texture.needsUpdate = true; invalidate()
      }
      loaded.dispose()
    }, undefined, () => { /* Keep the visible fallback if a request fails. */ })
    return texture
  }
  const scanned = (assets: { url: string }[], repeat: [number, number], color: string, relief: number) => {
    const material = new THREE.MeshStandardMaterial({
      color, map: map(assets[0].url, repeat, true), normalMap: map(assets[1].url, repeat, false),
      roughnessMap: map(assets[2].url, repeat, false), roughness: Math.max(.95, fallback.roughness),
      normalScale: new THREE.Vector2(relief, relief),
    })
    materials.push(material)
    return material
  }
  const grass = scanned([grassColor, grassNormal, grassRough], [5, 10], '#b0d3a0', .28)
  const concrete = scanned([concreteColor, concreteNormal, concreteRough], [3, 6], '#d0cec6', .35)
  const synthetic = scanned([syntheticColor, syntheticNormal, syntheticRough], [5, 10], '#62958a', .16)
  const clay = synthetic.clone(); clay.color.set('#b97f60'); materials.push(clay)
  // Court-space UVs keep mowing and wear continuous instead of ten tiny tiled strips.
  for (const [kind, material] of Object.entries({ grass, synthetic, concrete, clay })) {
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec2 courtUv;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\ncourtUv = uv;')
      shader.fragmentShader = 'varying vec2 courtUv;\n' + shader.fragmentShader
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        ${kind === 'synthetic' ? 'diffuseColor.rgb = mix(vec3(.13,.29,.24), diffuseColor.rgb, .28);' : ''}
        float edge = 1.0 - smoothstep(0.0, 0.055, min(min(courtUv.x, 1.0-courtUv.x), min(courtUv.y, 1.0-courtUv.y)));
        float baseline = exp(-pow((abs(courtUv.y-.5)-.44)/.024, 2.0));
        float footfall = exp(-pow((courtUv.x-.5)/.27, 2.0));
        float irregular = .65 + .35*sin(courtUv.x*51.0 + sin(courtUv.y*33.0)*2.0);
        ${kind === 'grass' ? `
          float stripe = smoothstep(.47,.53,fract(courtUv.x*10.0));
          diffuseColor.rgb *= mix(.93,1.035,stripe);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.25,.22,.12), baseline*footfall*irregular*.28);
        ` : 'diffuseColor.rgb *= 1.0 - baseline*footfall*irregular*.06;'}
        diffuseColor.rgb *= 1.0-edge*irregular*.10;
      `)
    }
    material.customProgramCacheKey = () => `club-surface-${kind}-v1`
  }
  const meshBytes = new Uint8Array(128 * 128 * 4)
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const a = (x + y) % 16, b = (x - y + 128) % 16
    const wire = a < 2 || b < 2 ? 255 : 0, offset = (y * 128 + x) * 4
    meshBytes.set([wire, wire, wire, 255], offset)
  }
  const alpha = new THREE.DataTexture(meshBytes, 128, 128)
  alpha.wrapS = alpha.wrapT = THREE.RepeatWrapping; alpha.repeat.set(10, 2)
  // Filter coverage rather than hard-cutting averaged wires, avoiding both
  // disappearing fences and sparkling moiré at overview distances.
  alpha.generateMipmaps = true; alpha.minFilter = THREE.LinearMipmapLinearFilter; alpha.needsUpdate = true
  textures.push(alpha)
  const fence = new THREE.MeshStandardMaterial({ color: '#52605a', alphaMap: alpha, alphaTest: .02, transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: .72, metalness: .3 })
  const steel = new THREE.MeshStandardMaterial({ color: '#5e685f', roughness: .68, metalness: .42 })
  materials.push(fence, steel)
  return { grass, synthetic, concrete, clay, fence, steel,
    dispose() { disposed = true; textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()) },
  }
}