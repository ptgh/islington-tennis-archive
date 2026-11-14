import * as THREE from 'three'

/** Shade the existing water polygons using ripples measured in metres. */
export function createWaterFinish(color: string, worldScale = 1) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: .31, metalness: .12 })
  material.name = 'Mapped water'
  const waterTime = { value: 0 }, waterWind = { value: 0 }
  material.onBeforeCompile = shader => {
    shader.uniforms.waterTime = waterTime
    shader.uniforms.waterWind = waterWind
    shader.vertexShader = 'varying vec2 waterMetres;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      waterMetres = (modelMatrix * vec4(transformed, 1.0)).xz / ${worldScale.toFixed(3)};
    `)
    shader.fragmentShader = `
      varying vec2 waterMetres;
      uniform float waterTime, waterWind;
    ` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 waveA = vec2(.82, .27), waveB = vec2(-.36, 1.15);
      vec2 warpA = vec2(.07, .19), warpB = vec2(.21, -.05);
      float bendA = dot(waterMetres, warpA), bendB = dot(waterMetres, warpB);
      float phaseA = dot(waterMetres, waveA) + sin(bendA) * 1.5 - waterTime * .8;
      float phaseB = dot(waterMetres, waveB) + sin(bendB) * 1.3 + waterTime * .56;
      vec2 fineWave = vec2(2.8, -3.6), fineWarp = vec2(.17, .10);
      float fineBend = dot(waterMetres, fineWarp) - waterTime * .26;
      float finePhase = dot(waterMetres, fineWave) + sin(fineBend) * 2.0 - waterTime * 1.9;
      // Filter each wave independently before its pattern gets smaller than a pixel.
      float rippleA = 1.0 - smoothstep(.55, 2.2, fwidth(phaseA));
      float rippleB = 1.0 - smoothstep(.55, 2.2, fwidth(phaseB));
      float fineRipple = 1.0 - smoothstep(.55, 2.2, fwidth(finePhase));
      float wind = clamp(waterWind, 0.0, 1.0);
      float waterShade = sin(phaseA) * rippleA * .6 + sin(phaseB) * rippleB * .4;
      diffuseColor.rgb *= 1.0 + waterShade * (.018 + .030 * wind);
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      // Average the unresolved ripples into a broader highlight at distance.
      roughnessFactor += wind * (.04 + .12 * (1.0 - fineRipple));
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 slopeA = (waveA + warpA * (1.5 * cos(bendA))) * cos(phaseA);
      vec2 slopeB = (waveB + warpB * (1.3 * cos(bendB))) * cos(phaseB);
      vec2 fineSlope = (fineWave + fineWarp * (2.0 * cos(fineBend))) * cos(finePhase);
      vec2 waterSlope = (slopeA * rippleA + slopeB * rippleB * .65) * (.058 + .10 * wind);
      waterSlope += fineSlope * fineRipple * (.005 + .013 * wind);
      vec3 waterTilt = mat3(viewMatrix) * vec3(-waterSlope.x, 0.0, -waterSlope.y);
      normal = normalize(normal + waterTilt);
    `)
  }
  material.customProgramCacheKey = () => `mapped-water-ripples-v2-${worldScale}`
  return {
    material,
    animate(time: number, wind: number) {
      waterTime.value = time
      waterWind.value = wind
    },
  }
}
