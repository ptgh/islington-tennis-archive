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
      float phaseA = dot(waterMetres, waveA) + sin(waterMetres.y * .19 + waterMetres.x * .07) * 1.5 - waterTime * .8;
      float phaseB = dot(waterMetres, waveB) + sin(waterMetres.x * .21 - waterMetres.y * .05) * 1.3 + waterTime * .56;
      // Filter each wave independently before its pattern gets smaller than a pixel.
      float rippleA = 1.0 - smoothstep(.55, 2.2, fwidth(phaseA));
      float rippleB = 1.0 - smoothstep(.55, 2.2, fwidth(phaseB));
      float wind = clamp(waterWind, 0.0, 1.0);
      float waterShade = sin(phaseA) * rippleA * .6 + sin(phaseB) * rippleB * .4;
      diffuseColor.rgb *= 1.0 + waterShade * (.018 + .030 * wind);
    `).replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      vec2 waterSlope = waveA * cos(phaseA) * rippleA + waveB * cos(phaseB) * rippleB * .65;
      vec3 waterTilt = mat3(viewMatrix) * vec3(waterSlope.x, 0.0, waterSlope.y);
      normal = normalize(normal + waterTilt * (.058 + .12 * wind));
    `)
  }
  material.customProgramCacheKey = () => `mapped-water-ripples-${worldScale}`
  return {
    material,
    animate(time: number, wind: number) {
      waterTime.value = time
      waterWind.value = wind
    },
  }
}
