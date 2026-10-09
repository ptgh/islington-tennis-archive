import * as THREE from 'three'

// Small, repeatable surface maps keep the miniature crisp close up without
// shipping a photograph, creating a canvas, or adding a network dependency.
function noise(x: number, y: number, seed = 0) {
  let n = Math.imul(x + seed * 97, 374761393) + Math.imul(y + seed * 131, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function field(x: number, y: number, size: number, seed: number) {
  const ix = Math.floor(x / size), iy = Math.floor(y / size)
  const fx = x / size - ix, fy = y / size - iy
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
  const top = THREE.MathUtils.lerp(noise(ix, iy, seed), noise(ix + 1, iy, seed), sx)
  const bottom = THREE.MathUtils.lerp(noise(ix, iy + 1, seed), noise(ix + 1, iy + 1, seed), sx)
  return THREE.MathUtils.lerp(top, bottom, sy)
}

type Pixel = [number, number, number]

function surface(size: number, pixel: (x: number, y: number) => Pixel, color = true) {
  const bytes = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sample = pixel(x, y), offset = (y * size + x) * 4
      bytes[offset] = Math.round(THREE.MathUtils.clamp(sample[0], 0, 255))
      bytes[offset + 1] = Math.round(THREE.MathUtils.clamp(sample[1], 0, 255))
      bytes[offset + 2] = Math.round(THREE.MathUtils.clamp(sample[2], 0, 255))
      bytes[offset + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat)
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 16
  texture.needsUpdate = true
  return texture
}

function brickPixel(x: number, y: number, relief: boolean): Pixel {
  const row = Math.floor(y / 16), bx = (x + (row % 2) * 16) % 32, by = y % 16
  const joint = bx < 1.3 || by < 1.3
  const variation = noise(Math.floor((x + (row % 2) * 16) / 32), row, 3)
  const grain = noise(x, y, 12) - .5
  if (relief) {
    const height = joint ? 95 : 188 + grain * 22
    return [height, height, height]
  }
  const value = joint ? 186 + grain * 8 : 229 + variation * 24 + grain * 12
  return [value, value * .994, value * .977]
}

function slatePixel(x: number, y: number, relief: boolean): Pixel {
  const row = Math.floor(y / 16), bx = (x + (row % 2) * 16) % 32, by = y % 16
  const joint = bx < 1.2 || by < 1.2
  const variation = noise(Math.floor((x + (row % 2) * 16) / 32), row, 25)
  const grain = noise(x, y, 37) - .5
  if (relief) {
    const height = joint ? 85 : 185 + by * 2
    return [height, height, height]
  }
  // A light leading edge makes the overlapping courses readable in sunlight.
  const value = joint ? 124 : 201 + variation * 35 + grain * 9 + (by > 14 ? 11 : 0)
  return [value * .965, value * .989, value]
}

function grassPixel(x: number, y: number): Pixel {
  const broad = field(x, y, 57, 43) - .5
  const fine = field(x, y, 9, 55) - .5
  const blade = noise(x, y, 63) - .5
  const dry = Math.max(0, field(x, y, 24, 67) - .63)
  const value = 225 + broad * 28 + fine * 18 + blade * 13
  return [value * (.961 + dry * .18), value, value * (.93 - dry * .15)]
}

function pavingPixel(x: number, y: number): Pixel {
  const row = Math.floor(y / 32), col = Math.floor((x + (row % 2) * 16) / 32)
  const seam = y % 32 < 1 || (x + (row % 2) * 16) % 32 < 1
  const fleck = noise(x, y, 71) - .5
  const slab = noise(col, row, 73) - .5
  const value = seam ? 207 : 234 + slab * 12 + fleck * 13
  return [value, value * .979, value * .94]
}

function createFoliageGeometry() {
  const geometry = new THREE.SphereGeometry(1, 16, 11)
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    const azimuth = Math.atan2(z, x)
    const middle = Math.sqrt(Math.max(0, 1 - y * y))
    const lobes = Math.sin(azimuth * 5 + y * 3.4) * .085
      + Math.cos(azimuth * 8 - y * 5.1) * .045
      + Math.sin(azimuth * 3 + y * 7.8) * .055
    const radius = 1 + lobes * middle
    position.setXYZ(i,
      x * radius * (1 - .12 * Math.max(0, y)),
      y * .96 + Math.sin(azimuth * 4 + 1.7) * .035 * middle,
      z * radius * (1 + .035 * Math.sin(y * 6)),
    )
    // Linear vertex tints multiply the per-instance species colour. The crown
    // has a warm top and deeper underside, including with soft ambient light.
    const light = .72 + (y + 1) * .12 + Math.sin(azimuth * 4 + y * 3) * .035 * middle
    colors[i * 3] = light
    colors[i * 3 + 1] = Math.min(1, light + .025)
    colors[i * 3 + 2] = light * .93
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  const core = geometry.toNonIndexed()
  const positions = Array.from(core.getAttribute('position').array)
  const normals = Array.from(core.getAttribute('normal').array)
  const uvs = Array.from(core.getAttribute('uv').array)
  const tints = Array.from(core.getAttribute('color').array)
  const normal = new THREE.Vector3(), edge = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

  // Tiny folded leaves physically break the outline. This replaces detail in
  // the smooth core rather than multiplying the geometry cost of every tree.
  for (let i = 0; i < 96; i++) {
    const y = 1 - (i + .5) / 48
    const angle = i * 2.399963229728653
    const radius = Math.sqrt(1 - y * y)
    const direction = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
    const lobes = Math.sin(angle * 5 + y * 3.4) * .085
      + Math.cos(angle * 8 - y * 5.1) * .045
      + Math.sin(angle * 3 + y * 7.8) * .055
    const center = direction.clone().multiplyScalar(1.015 + lobes * radius)
    center.x *= 1 - .12 * Math.max(0, y)
    center.y = y * .96 + Math.sin(angle * 4 + 1.7) * .035 * radius
    center.z *= 1 + .035 * Math.sin(y * 6)
    const across = new THREE.Vector3().crossVectors(direction, up).normalize()
    const along = new THREE.Vector3().crossVectors(across, direction).normalize()
    across.applyAxisAngle(direction, noise(i, 8, 109) * Math.PI)
    along.applyAxisAngle(direction, noise(i, 8, 109) * Math.PI)
    const width = .06 + noise(i, 4, 117) * .035
    const length = .10 + noise(i, 3, 123) * .065
    const points = [
      center.clone().addScaledVector(along, length),
      center.clone().addScaledVector(across, width).addScaledVector(direction, -.018),
      center.clone().addScaledVector(along, -length),
      center.clone().addScaledVector(across, -width).addScaledVector(direction, .025),
    ]
    const light = .78 + noise(i, 2, 131) * .2
    const coordinates = [[.5, 1], [1, .5], [.5, 0], [0, .5]]
    for (const face of [[0, 1, 2], [0, 2, 3]]) {
      normal.subVectors(points[face[1]], points[face[0]])
      edge.subVectors(points[face[2]], points[face[0]])
      normal.cross(edge).normalize()
      for (const index of face) {
        const point = points[index]
        positions.push(point.x, point.y, point.z)
        normals.push(normal.x, normal.y, normal.z)
        uvs.push(coordinates[index][0], coordinates[index][1])
        tints.push(light, Math.min(1, light + .025), light * .92)
      }
    }
  }
  const crown = new THREE.BufferGeometry()
  crown.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  crown.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  crown.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  crown.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3))
  crown.computeBoundingSphere()
  geometry.dispose()
  core.dispose()
  return crown
}

function leafPixel(x: number, y: number) {
  const cell = 10, cx = Math.floor(x / cell), cy = Math.floor(y / cell)
  let cover = 0, variation = 0
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const ix = cx + ox, iy = cy + oy
      const px = (ix + .2 + noise(ix, iy, 141) * .6) * cell
      const py = (iy + .2 + noise(ix, iy, 147) * .6) * cell
      const angle = noise(ix, iy, 151) * Math.PI
      const dx = x - px, dy = y - py
      const u = (dx * Math.cos(angle) + dy * Math.sin(angle)) / 5.8
      const v = (-dx * Math.sin(angle) + dy * Math.cos(angle)) / 2.7
      const shape = Math.max(0, 1 - u * u - v * v)
      if (shape > cover) {
        cover = shape
        variation = noise(ix, iy, 157)
      }
    }
  }
  return { cover, variation }
}

export function createMiniatureMaterials() {
  const brickMap = surface(512, (x, y) => brickPixel(x, y, false))
  const brickBump = surface(512, (x, y) => brickPixel(x, y, true), false)
  const slateMap = surface(256, (x, y) => slatePixel(x, y, false))
  const slateBump = surface(256, (x, y) => slatePixel(x, y, true), false)
  const grassMap = surface(256, grassPixel)
  grassMap.repeat.set(72, 72)
  const parkMap = surface(256, grassPixel)
  parkMap.repeat.set(8, 8)
  const asphaltMap = surface(128, (x, y) => {
    const value = 225 + (noise(x, y, 79) - .5) * 24 + (field(x, y, 18, 81) - .5) * 12
    return [value, value, value]
  })
  asphaltMap.repeat.set(3, 3)
  const pavingMap = surface(256, pavingPixel)
  pavingMap.repeat.set(3, 3)
  const grassBump = surface(256, (x, y) => {
    const value = 120 + (noise(x, y, 167) - .5) * 65 + field(x, y, 9, 55) * 30
    return [value, value, value]
  }, false)
  grassBump.repeat.copy(grassMap.repeat)
  const parkBump = grassBump.clone()
  parkBump.repeat.copy(parkMap.repeat)
  const aggregateMap = surface(256, (x, y) => {
    const value = 210 + (noise(x, y, 173) - .5) * 45 + (field(x, y, 7, 179) - .5) * 18
    return [value, value, value]
  })
  aggregateMap.repeat.set(4, 6)
  const aggregateBump = surface(256, (x, y) => {
    const value = 100 + noise(x, y, 173) * 100
    return [value, value, value]
  }, false)
  aggregateBump.repeat.copy(aggregateMap.repeat)
  const woodMap = surface(256, (x, y) => {
    const grain = Math.sin(x * .7 + field(x, y, 24, 181) * 9) * 11
    const value = 220 + grain + (noise(x, y, 183) - .5) * 16
    return [value, value * .96, value * .89]
  })
  woodMap.repeat.set(2, 1)
  const netAlpha = surface(128, (x, y) => {
    const value = x % 8 < 1 || y % 8 < 1 ? 255 : 0
    return [value, value, value]
  }, false)
  netAlpha.repeat.set(12, 1)
  const foliageMap = surface(128, (x, y) => {
    const leaf = leafPixel(x, y)
    const value = 193 + leaf.cover * (32 + leaf.variation * 26) + field(x, y, 22, 93) * 15
    return [value * .98, Math.min(255, value + 4), value * .935]
  })
  foliageMap.repeat.set(3, 2)
  const foliageBump = surface(128, (x, y) => {
    const leaf = leafPixel(x, y)
    const height = 80 + leaf.cover * 140 + noise(x, y, 101) * 12
    return [height, height, height]
  }, false)
  foliageBump.repeat.copy(foliageMap.repeat)

  const brick = new THREE.MeshStandardMaterial({
    color: '#ffffff', map: brickMap, bumpMap: brickBump, bumpScale: .022, roughness: .92,
  })
  const slate = new THREE.MeshStandardMaterial({
    color: '#9ca7a5', map: slateMap, bumpMap: slateBump, bumpScale: .035, roughness: .86,
  })
  const grass = new THREE.MeshStandardMaterial({ color: '#8aa777', map: grassMap, bumpMap: grassBump, bumpScale: .025, roughness: 1 })
  const parkGrass = new THREE.MeshStandardMaterial({ color: '#91ad73', map: parkMap, bumpMap: parkBump, bumpScale: .025, roughness: 1 })
  const asphalt = new THREE.MeshStandardMaterial({ color: '#a6a69e', map: asphaltMap, bumpMap: aggregateBump, bumpScale: .012, roughness: .97 })
  const paving = new THREE.MeshStandardMaterial({ color: '#d8d0bd', map: pavingMap, roughness: .98 })
  const hardCourt = new THREE.MeshStandardMaterial({ color: '#4d939b', map: aggregateMap, bumpMap: aggregateBump, bumpScale: .006, roughness: .91 })
  const timber = new THREE.MeshStandardMaterial({ color: '#94795e', map: woodMap, roughness: .87 })
  const ballast = new THREE.MeshStandardMaterial({ color: '#a4a191', map: aggregateMap, bumpMap: aggregateBump, bumpScale: .065, roughness: 1 })
  const net = new THREE.MeshStandardMaterial({ color: '#506d61', alphaMap: netAlpha, alphaTest: .45, side: THREE.DoubleSide, roughness: .95 })
  const foliage = new THREE.MeshStandardMaterial({
    color: '#ffffff', map: foliageMap, bumpMap: foliageBump, bumpScale: .075,
    roughness: .94, vertexColors: true, side: THREE.DoubleSide,
  })
  // Animatein the vertex shader so every crown moves without rebuilding
  // thousands of instance matrices. The depth pass uses the same deformation.
  const windTime = { value: 0 }, windStrength = { value: .045 }
  const wind = (material: THREE.Material) => {
    material.onBeforeCompile = shader => {
      shader.uniforms.miniatureWindTime = windTime
      shader.uniforms.miniatureWindStrength = windStrength
      shader.vertexShader = 'uniform float miniatureWindTime;\nuniform float miniatureWindStrength;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        vec3 windOrigin = vec3(0.0);
        #ifdef USE_INSTANCING
          windOrigin = instanceMatrix[3].xyz;
        #endif
        float windPhase = windOrigin.x * .021 + windOrigin.z * .017;
        float crownWeight = clamp((position.y + 1.0) * .5, 0.0, 1.0);
        float gust = .72 + .28 * sin(miniatureWindTime * .19 + windPhase * .35);
        float flutter = sin(miniatureWindTime * 2.4 + windPhase * 1.7) * .12;
        transformed.x += (sin(miniatureWindTime * .85 + windPhase) + flutter) * miniatureWindStrength * gust * crownWeight;
        transformed.z += cos(miniatureWindTime * .63 + windPhase) * miniatureWindStrength * .55 * gust * crownWeight;
      `)
    }
    material.customProgramCacheKey = () => 'miniature-crown-wind-v2'
  }
  wind(foliage)
  const foliageDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })
  wind(foliageDepth)
  const foliageGeometry = createFoliageGeometry()
  const materials = [brick, slate, grass, parkGrass, asphalt, paving, foliage, hardCourt, timber, ballast, net]
  const textures = [brickMap, brickBump, slateMap, slateBump, grassMap, parkMap, asphaltMap, pavingMap, foliageMap, foliageBump, grassBump, parkBump, aggregateMap, aggregateBump, woodMap, netAlpha]
  let disposed = false

  return {
    brick, slate, grass, parkGrass, asphalt, paving, foliage, foliageGeometry, foliageDepth, hardCourt, timber, ballast, net,
    wind,
    setWind(time: number, strength: number) { windTime.value = time; windStrength.value = strength },
    dispose() {
      if (disposed) return
      disposed = true
      materials.forEach(material => material.dispose())
      textures.forEach(texture => texture.dispose())
      foliageGeometry.dispose()
      foliageDepth.dispose()
    },
  }
}
