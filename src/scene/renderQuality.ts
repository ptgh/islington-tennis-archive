import * as THREE from 'three'
import { QUALITY_PRESETS, type QualityPreset } from '../data/viewQuality.ts'

/** Supersample on capable displays without allocating unbounded retina buffers. */
export function scenePixelRatio(width: number, height: number, deviceRatio: number, qualityScale = 1) {
  const compact = width <= 760
  const scale = Math.min(1.15, Math.max(.7, qualityScale))
  const nativeRatio = Math.max(1, deviceRatio)
  const base = Math.min(nativeRatio, compact ? 2 : 2.5,
    Math.sqrt((compact ? 3200000 : 8500000) / Math.max(1, width * height)))
  return Math.min(nativeRatio, base * scale)
}

/** Measure only consecutive, requested frames. Wall time includes GPU backpressure
 * and CPU work; submission time alone cannot measure asynchronous GPU execution.
 * Slow windows lower resolution promptly; five seconds of headroom raise it.
 * No timers or redraws are introduced for idle, hidden or reduced-motion views.
 */
export function createAdaptiveResolution(targetFrameMs = 1000 / 60, initialPreset: QualityPreset = 'balanced') {
  let preset = initialPreset
  let scale: number = QUALITY_PRESETS[preset].initial, previous = 0, elapsed = 0, frames = 0, totalRender = 0
  let frameMs = 0, renderMs = 0
  const pause = () => { previous = 0; elapsed = 0; frames = 0; totalRender = 0 }
  return {
    get scale() { return scale },
    get stats() { return { scale, frameMs, renderMs, targetFrameMs, preset } },
    setPreset(next: QualityPreset) {
      if (next === preset) return false
      preset = next; scale = QUALITY_PRESETS[preset].initial
      pause()
      return true
    },
    pause,
    sample(time: number, submissionMs: number) {
      const interval = previous ? time - previous : 0
      previous = time
      // A long gap may be tab suspension or a scene build, not sustained load.
      if (interval <= 0 || interval > 250) { elapsed = 0; frames = 0; totalRender = 0; return false }
      elapsed += interval; totalRender += submissionMs; frames++
      if (elapsed < 1000 || frames < 20) return false
      frameMs = elapsed / frames; renderMs = totalRender / frames
      const slow = frameMs > targetFrameMs * 1.3 || renderMs > targetFrameMs * .9
      const headroom = frameMs <= targetFrameMs * 1.2 && renderMs < targetFrameMs * .65
      if (!slow && elapsed < 5000) return false
      const bounds = QUALITY_PRESETS[preset]
      const next = Math.round(Math.min(bounds.max, Math.max(bounds.min, scale + (slow ? -.05 : headroom ? .05 : 0))) * 100) / 100
      pause()
      const changed = next !== scale
      scale = next
      return changed
    },
  }
}

/** Khronos PBR Neutral keeps painted colours true in bright light. ACES pushed
 * lawns toward olive and court acrylic toward black, away from the illustration. */
export const SCENE_TONE_MAPPING = THREE.NeutralToneMapping

/** Exposure and lens saturation measured against docs/design-concept.png (map
 * area: mean luma .469, saturation .312) and, at night, the previous ACES look.
 * `lift` lets a view keep its relative brightness without a second rule. */
export const SCENE_GRADE = { day: { exposure: 1.5, saturation: .82 }, night: { exposure: 1, saturation: .72 } }
export function applySceneGrade(renderer: THREE.WebGLRenderer, lens: Record<string, THREE.IUniform>, night: boolean, lift = 1) {
  const grade = night ? SCENE_GRADE.night : SCENE_GRADE.day
  renderer.toneMappingExposure = grade.exposure * (night ? 1 : lift)
  lens.saturation.value = grade.saturation
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
/**
 * Photographic finish for the miniatures: a tilt-shift focus band (the cue
 * that makes aerial models read as real objects photographed close up),
 * gentle split-tone grading, soft vignette and fine grain to break up
 * flat computer-graphics fills. Runs once per frame on the final image.
 */
export const LENS_FINISH = { focus: .5, band: .22, blur: 3.2, vignette: .28, contrast: 1.06, saturation: SCENE_GRADE.day.saturation, grain: .018 }

export function applyViewFocus(lens: Record<string, THREE.IUniform>, sharp: boolean) {
  lens.band.value = sharp ? .55 : LENS_FINISH.band
  lens.blur.value = sharp ? .65 : LENS_FINISH.blur
}

export function createLensFinish() {
  return {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(1, 1) },
      pixelRatio: { value: 1 },
      focus: { value: LENS_FINISH.focus },
      band: { value: LENS_FINISH.band },
      blur: { value: LENS_FINISH.blur },
      vignette: { value: LENS_FINISH.vignette },
      contrast: { value: LENS_FINISH.contrast },
      saturation: { value: LENS_FINISH.saturation },
      grain: { value: LENS_FINISH.grain },
      time: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float pixelRatio;
      uniform float focus, band, blur, vignette, contrast, saturation, grain, time;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        float d = max(0.0, abs(vUv.y - focus) - band * .5);
        float amount = smoothstep(0.0, .32, d) * blur;
        vec3 colour = texture2D(tDiffuse, vUv).rgb;
        if (amount > .01) {
          vec3 sum = colour; float weight = 1.0;
          for (int i = 0; i < 16; i++) {
            float a = float(i) * 2.39996;
            float r = sqrt(float(i) + .5) / 4.0;
            vec2 o = vec2(cos(a), sin(a)) * r * amount * pixelRatio / resolution;
            sum += texture2D(tDiffuse, vUv + o).rgb; weight += 1.0;
          }
          colour = sum / weight;
        }
        float luma = dot(colour, vec3(.2126,.7152,.0722));
        colour = mix(vec3(luma), colour, saturation);
        colour = (colour - .5) * contrast + .5;
        // Warm highlights, cool shadows: the light of a late-summer afternoon.
        colour += mix(vec3(-.006,.0,.012), vec3(.014,.006,-.01), smoothstep(.2,.8,luma));
        vec2 c = vUv - .5;
        colour *= 1.0 - vignette * smoothstep(.35, .85, length(c * vec2(1.0, .85)));
        colour += (hash(vUv * resolution + time) - .5) * grain;
        gl_FragColor = vec4(clamp(colour, 0.0, 1.0), 1.0);
      }`,
  }
}

/** Blur is authored in CSS pixels, so Retina screens get the same depth of field. */
export function resizeLensFinish(uniforms: Record<string, THREE.IUniform>, width: number, height: number, pixelRatio: number) {
  uniforms.resolution.value.set(width * pixelRatio, height * pixelRatio)
  uniforms.pixelRatio.value = pixelRatio
}
