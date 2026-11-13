import type * as THREE from 'three'
import { RAIL_SLEEPER_LENGTH, RAIL_SLEEPER_SPACING } from './mappedRailway.ts'

/** One instanced ballast surface carries the stone texture and sleeper pattern.
 * Sample the track in metres so detail does not stretch with source segments. */
export function createBoroughRailFinish(ballast: THREE.MeshStandardMaterial) {
  const material = ballast.clone()
  material.name = 'Borough railway ballast'
  material.bumpScale *= .1
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 trackMetres; varying float trackTop;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vec3 axis = normalize(instanceMatrix[0].xyz);
      // Canonical direction keeps the phase stable on collinear pieces drawn in reverse.
      axis *= axis.x < 0.0 || (axis.x == 0.0 && axis.z < 0.0) ? -1.0 : 1.0;
      vec3 trackPoint = (instanceMatrix * vec4(position, 1.0)).xyz;
      trackMetres = 10.0 * vec2(dot(axis, trackPoint), position.z * length(instanceMatrix[2].xyz));
      trackTop = max(normal.y, 0.0);
      #ifdef USE_MAP
        vMapUv = trackPoint.xz * 8.0;
      #endif
      #ifdef USE_BUMPMAP
        vBumpMapUv = trackPoint.xz * 8.0;
      #endif
    `)
    shader.fragmentShader = 'varying vec2 trackMetres; varying float trackTop;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      const float sleeperSpacing = ${RAIL_SLEEPER_SPACING};
      const float halfSleeper = ${RAIL_SLEEPER_LENGTH / 2};
      float distanceAlong = abs(fract(trackMetres.x / sleeperSpacing + .5) - .5) * sleeperSpacing;
      float pixel = max(fwidth(trackMetres.x), .001);
      float sleeper = 1.0 - smoothstep(halfSleeper - pixel * .5, halfSleeper + pixel * .5, distanceAlong);
      sleeper *= 1.0 - smoothstep(1.23, 1.32, abs(trackMetres.y));
      sleeper *= 1.0 - smoothstep(.24, .55, pixel);
      diffuseColor.rgb *= 1.0 - trackTop * sleeper * .44;
    `)
  }
  material.customProgramCacheKey = () => 'borough-rail-sleepers-v1'
  return material
}
