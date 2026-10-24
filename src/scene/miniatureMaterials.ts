import * as THREE from 'three'

/** Layer seen only by the shadow pass in the town and club renderers. */
export const SHADOW_PROXY_LAYER = 1

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

/** Clones retain the world-scale UV treatment; Three's material.clone does not
 * copy onBeforeCompile. Shared texture ownership remains with the finish set. */
export function cloneArchitecturalFinish(base: THREE.MeshStandardMaterial, color: string) {
  const copy = base.clone()
  copy.color.set(color)
  copy.onBeforeCompile = base.onBeforeCompile
  copy.customProgramCacheKey = base.customProgramCacheKey
  return copy
}

/** Landmark dimensions vary widely; keep masonry and roof courses in metres. */
export function cloneWorldArchitecturalFinish(base:THREE.MeshStandardMaterial,color:string,roof=false) {
  const copy=cloneArchitecturalFinish(base,color)
  architecturalUV(copy,roof)
  return copy
}

function architecturalUV(material: THREE.MeshStandardMaterial, roof: boolean, span = roof ? 6 : 4) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      mat4 architectureModel = modelMatrix;
      #ifdef USE_INSTANCING
        architectureModel *= instanceMatrix;
      #endif
      vec3 architectureWorld = (architectureModel * vec4(transformed, 1.0)).xyz;
      vec3 architectureNormal = mat3(architectureModel) * normal;
      vec2 architectureUv = ${roof ? 'architectureWorld.xz' : 'vec2(abs(architectureNormal.x) > abs(architectureNormal.z) ? architectureWorld.z : architectureWorld.x, architectureWorld.y)'} / ${span.toFixed(1)};
      #ifdef USE_MAP
        vMapUv = architectureUv;
      #endif
      #ifdef USE_BUMPMAP
        vBumpMapUv = architectureUv;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = architectureUv;
      #endif
    `)
  }
  material.customProgramCacheKey = () => `architecture-world-uv-${roof ? 'roof' : 'wall'}-${span}-v2`
}

/** Varied panes and selective warm rooms use the existing lighting and PBR
 * environment. No interior geometry, extra pass, or per-frame uniforms. */
function architecturalGlass(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 glassWorld; varying vec3 glassOrigin; varying vec2 glassPanel; varying vec2 glassSpan; varying float glassVertical;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      mat4 glassModel = modelMatrix;
      #ifdef USE_INSTANCING
        glassModel *= instanceMatrix;
      #endif
      glassWorld = (glassModel * vec4(transformed, 1.0)).xyz;
      glassOrigin = glassModel[3].xyz;
      vec3 glassSize = vec3(length(glassModel[0].xyz), length(glassModel[1].xyz), length(glassModel[2].xyz));
      // Project onto the actual face: upright windows use their height, while
      // horizontal rooflights retain a clear sky-facing surface.
      if (abs(normal.y) > .5) glassSpan = glassSize.xz;
      else if (abs(normal.x) > .5) glassSpan = glassSize.zy;
      else glassSpan = glassSize.xy;
      glassPanel = uv - .5;
      glassVertical = 1.0 - step(.5, abs(normal.y));
    `)
    shader.fragmentShader = `varying vec3 glassWorld; varying vec3 glassOrigin; varying vec2 glassPanel; varying vec2 glassSpan; varying float glassVertical;
      float paneHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      ` + shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        vec2 paneCount = max(vec2(1.0), floor(glassSpan / 2.4 + .5));
        vec2 paneCoordinates = clamp(glassPanel + .5, 0.0, .9999) * paneCount;
        vec2 paneLocal = fract(paneCoordinates);
        float pane = paneHash(floor(glassOrigin.xz * 1.7) + floor(glassOrigin.y) * 7.0 + floor(paneCoordinates));
        float reflection = smoothstep(0.0, 18.0, glassWorld.y);
        diffuseColor.rgb *= mix(.82, 1.09, pane);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.91,1.025,1.12), reflection * .32);
        float edgeDistance = min(min(paneLocal.x, 1.0-paneLocal.x), min(paneLocal.y, 1.0-paneLocal.y));
        diffuseColor.rgb *= mix(1.0, mix(.68, 1.0, smoothstep(0.0, .07, edgeDistance)), glassVertical);
        float curtainX = mix(paneLocal.x, 1.0-paneLocal.x, step(.5, fract(pane * 7.13)));
        float curtain = (1.0-smoothstep(.12 + pane*.16, .16 + pane*.16, curtainX)) * step(.48, pane) * glassVertical;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.46, .43, .34), curtain * .42);
      `).replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        float occupied = step(.60, pane);
        totalEmissiveRadiance *= mix(.055, 1.0, occupied) * (1.0-curtain*.65);
      `)
  }
  material.customProgramCacheKey = () => 'architecture-glass-v2'
}

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

/** Twenty-four-metre asphalt tile: small repairs and occasional hairline cracks
 * share one baked colour/relief/roughness field, without extra street meshes. */
function asphaltSample(x:number,y:number) {
  const col=Math.floor(x/128),row=Math.floor(y/128),u=x%128,v=y%128
  const repair=noise(col,row,281)>.90
  const halfWidth=16+noise(col,row,283)*16,halfDepth=22+noise(col,row,293)*24
  const centreX=44+noise(col,row,337)*40,centreY=50+noise(col,row,347)*28
  const edge=Math.min(halfWidth-Math.abs(u-centreX),halfDepth-Math.abs(v-centreY))+(field(x,y,7,307)-.5)*2
  const patch=repair?THREE.MathUtils.smoothstep(edge,-1,1):0
  const crackX=33+field(0,y,17,311)*42
  const crack=noise(col,row,313)>.90&&v>12&&v<112&&Math.abs(u-crackX)<.45?1:0
  const grain=noise(x,y,317)-.5,broad=field(x,y,87,331)-.5
  return {
    tone:228+grain*25+broad*24-patch*16-crack*22,
    height:145+grain*42-patch*3-crack*28,
    roughness:242+broad*13-patch*19+grain*7,
  }
}

function createFoliageGeometry(shadow = false) {
  // Five overlapping branch masses leave deep silhouette breaks instead of a
  // single solid ball. The total stays below the former 336 triangles per crown.
  const clusters = [
    { x: 0, y: .38, z: 0, sx: .58, sy: .64, sz: .56 },
    { x: .46, y: -.10, z: .12, sx: .59, sy: .57, sz: .53 },
    { x: -.32, y: -.20, z: .38, sx: .57, sy: .51, sz: .58 },
    { x: -.42, y: .02, z: -.30, sx: .55, sy: .59, sz: .54 },
    { x: .20, y: -.13, z: -.46, sx: .56, sy: .54, sz: .57 },
  ]
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[],tints:number[]=[]
  const unit = shadow?new THREE.IcosahedronGeometry(1,0):new THREE.SphereGeometry(1,6,4)
  const point = (direction:THREE.Vector3, cluster:typeof clusters[number], index:number, lift=0) => {
    const angle=Math.atan2(direction.z,direction.x)
    const relief=1+Math.sin(angle*3+direction.y*4+index)*.055
    return new THREE.Vector3(
      cluster.x+direction.x*(cluster.sx*relief+lift),
      cluster.y+direction.y*(cluster.sy*relief+lift),
      cluster.z+direction.z*(cluster.sz*relief+lift),
    )
  }
  for(const [index,cluster] of clusters.entries()){
    const geometry=unit.clone(),attribute=geometry.getAttribute('position')
    const colors=new Float32Array(attribute.count*3)
    for(let i=0;i<attribute.count;i++){
      const direction=new THREE.Vector3().fromBufferAttribute(attribute,i),p=point(direction,cluster,index)
      attribute.setXYZ(i,p.x,p.y,p.z)
      // Shade each branch mass, with lighter new growth on its upper surface.
      const light=.74+(direction.y+1)*.105+p.y*.035
      colors.set([light,Math.min(1,light+.025),light*.93],i*3)
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3))
    geometry.computeVertexNormals()
    const core=geometry.index?geometry.toNonIndexed():geometry
    const p=core.getAttribute('position'),n=core.getAttribute('normal'),uv=core.getAttribute('uv'),color=core.getAttribute('color')
    for(let face=0;face<p.count;face+=3){
      // Entirely buried faces contribute nothing to the silhouette or lighting.
      // Keep a conservative inset so cluster joins remain closed as they sway.
      const buried=clusters.some((other,j)=>j!==index&&[0,1,2].every(offset=>{
        const i=face+offset
        return ((p.getX(i)-other.x)/other.sx)**2+((p.getY(i)-other.y)/other.sy)**2+((p.getZ(i)-other.z)/other.sz)**2<.81
      }))
      if(buried)continue
      for(let i=face;i<face+3;i++){
        positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i))
        uvs.push(uv.getX(i),uv.getY(i));tints.push(color.getX(i),color.getY(i),color.getZ(i))
      }
    }
    geometry.dispose();if(core!==geometry)core.dispose()
  }
  unit.dispose()
  const normal=new THREE.Vector3(),edge=new THREE.Vector3(),up=new THREE.Vector3(0,1,0)
  // Folded leaves follow the individual masses, including the recesses between
  // them. No floating outer shell or extra transparent rendering pass.
  for(let i=0;i<(shadow?0:72);i++){
    const index=i%clusters.length,j=Math.floor(i/clusters.length),count=Math.ceil((72-index)/clusters.length)
    const y=1-(j+.5)*2/count,angle=j*2.399963229728653+index*.7,radius=Math.sqrt(1-y*y)
    const direction=new THREE.Vector3(Math.cos(angle)*radius,y,Math.sin(angle)*radius)
    const center=point(direction,clusters[index],index,.015)
    const across=new THREE.Vector3().crossVectors(direction,up).normalize()
    const along=new THREE.Vector3().crossVectors(across,direction).normalize()
    across.applyAxisAngle(direction,noise(i,8,109)*Math.PI)
    along.applyAxisAngle(direction,noise(i,8,109)*Math.PI)
    const width=.055+noise(i,4,117)*.035,length=.09+noise(i,3,123)*.06
    const points=[
      center.clone().addScaledVector(along,length),
      center.clone().addScaledVector(across,width).addScaledVector(direction,-.018),
      center.clone().addScaledVector(along,-length),
      center.clone().addScaledVector(across,-width).addScaledVector(direction,.025),
    ]
    const light=.78+noise(i,2,131)*.2,coordinates=[[.5,1],[1,.5],[.5,0],[0,.5]]
    for(const face of [[0,1,2],[0,2,3]]){
      normal.subVectors(points[face[1]],points[face[0]])
      edge.subVectors(points[face[2]],points[face[0]])
      normal.cross(edge).normalize()
      for(const index of face){
        const p=points[index];positions.push(p.x,p.y,p.z)
        normals.push(normal.x,normal.y,normal.z)
        uvs.push(coordinates[index][0],coordinates[index][1])
        tints.push(light,Math.min(1,light+.025),light*.92)
      }
    }
  }
  const crown=new THREE.BufferGeometry()
  crown.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  crown.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3))
  crown.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  crown.setAttribute('color',new THREE.Float32BufferAttribute(tints,3))
  crown.computeBoundingSphere()
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
  const asphaltMap = surface(512, (x, y) => {
    const value = asphaltSample(x,y).tone
    return [value, value, value]
  })
  const asphaltBump = surface(512,(x,y)=>{const v=asphaltSample(x,y).height;return [v,v,v]},false)
  const asphaltRoughness = surface(256,(x,y)=>{const v=asphaltSample(x*2,y*2).roughness;return [v,v,v]},false)
  const pavingMap = surface(256, pavingPixel)
  pavingMap.repeat.set(3, 3)
  const pavingBump = surface(256, (x,y) => {
    const row=Math.floor(y/32),joint=y%32<1||(x+(row%2)*16)%32<1
    const value=joint?100:153+noise(x,y,271)*9
    return [value,value,value]
  },false)
  const renderMap = surface(256, (x,y) => {
    const weather = field(x,y,48,211)-.5, grain=noise(x,y,223)-.5
    const streak = field(x, Math.floor(y/6), 13, 227)-.5
    const value=235+weather*10+grain*8+streak*3
    return [value,value*.992,value*.976]
  })
  const renderBump = surface(128,(x,y)=>{const v=145+noise(x,y,229)*65;return [v,v,v]},false)
  const metalRoofMap = surface(256,(x,y)=>{
    const seam=x%32, lap=y%128<2
    const value=seam<2?155:seam<4?252:lap?192:226+(noise(x,y,233)-.5)*13+(field(x,y,31,239)-.5)*19
    return [value*.979,value*.99,value]
  })
  const metalRoofBump = surface(256,(x,y)=>{const v=x%32<3?225:y%128<2?112:145;return [v,v,v]},false)
  const metalRoofRoughness = surface(256,(x,y)=>{
    // Raised folds catch light differently from the weathered sheet between them.
    const v=x%32<4?175:215+field(x,y,41,257)*32
    return [v,v,v]
  },false)
  const membraneMap = surface(256,(x,y)=>{
    const seam=x%64<1||y%128<1, grain=noise(x,y,241)-.5
    const value=seam?188:229+grain*18+(field(x,y,37,251)-.5)*24
    return [value,value*.993,value*.974]
  })
  const membraneRoughness = surface(128,(x,y)=>{
    const v=226+field(x,y,23,263)*27+(noise(x,y,269)-.5)*4
    return [v,v,v]
  },false)
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
  const stucco = new THREE.MeshStandardMaterial({color:'#d4cebc',map:renderMap,bumpMap:renderBump,bumpScale:.018,roughness:.96})
  const seamRoof = new THREE.MeshStandardMaterial({color:'#87938b',map:metalRoofMap,bumpMap:metalRoofBump,bumpScale:.055,roughnessMap:metalRoofRoughness,roughness:.8,metalness:.22})
  const membrane = new THREE.MeshStandardMaterial({color:'#b3b8b2',map:membraneMap,bumpMap:renderBump,bumpScale:.012,roughnessMap:membraneRoughness,roughness:1})
  architecturalUV(stucco,false);architecturalUV(seamRoof,true);architecturalUV(membrane,true)
  const glazing = new THREE.MeshStandardMaterial({color:'#456b63',roughness:.25,metalness:.12,envMapIntensity:1.1,emissive:'#f2bf6d',emissiveIntensity:0})
  architecturalGlass(glazing)
  const grass = new THREE.MeshStandardMaterial({ color: '#8aa777', map: grassMap, bumpMap: grassBump, bumpScale: .025, roughness: 1 })
  const parkGrass = new THREE.MeshStandardMaterial({ color: '#91ad73', map: parkMap, bumpMap: parkBump, bumpScale: .025, roughness: 1 })
  // World-space mottling: broad sunlit and shaded patches plus drier, warmer
  // ground, as in the concept's lawns. Fixed to the world so it never crawls.
  const mottle = (material: THREE.MeshStandardMaterial, key: string) => {
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec2 lawnWorld;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        lawnWorld = (modelMatrix * vec4(transformed, 1.0)).xz;`)
      shader.fragmentShader = `varying vec2 lawnWorld;
        float lawnHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float lawnNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(lawnHash(i), lawnHash(i + vec2(1, 0)), f.x), mix(lawnHash(i + vec2(0, 1)), lawnHash(i + vec2(1, 1)), f.x), f.y);
        }
        float lawnField(vec2 p) { return lawnNoise(p) * .55 + lawnNoise(p * 2.03 + 17.0) * .3 + lawnNoise(p * 4.1 + 31.0) * .15; }
        ` + shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        float lawnBroad = lawnField(lawnWorld / 34.0), lawnFine = lawnField(lawnWorld / 7.0 + 9.0);
        diffuseColor.rgb *= mix(.9, 1.07, lawnBroad) * mix(.97, 1.03, lawnFine);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 1.02, .8), smoothstep(.6, .8, lawnBroad) * .45);`)
    }
    material.customProgramCacheKey = () => key
  }
  mottle(grass, 'miniature-lawn-v1')
  mottle(parkGrass, 'miniature-park-lawn-v1')
  const asphalt = new THREE.MeshStandardMaterial({ color: '#96998f', map: asphaltMap, bumpMap: asphaltBump, bumpScale: .012, roughnessMap:asphaltRoughness, roughness: .97 })
  const paving = new THREE.MeshStandardMaterial({ color: '#d8d0bd', map: pavingMap, bumpMap:pavingBump, bumpScale:.018, roughness: .98 })
  // Horizontal materials keep a fixed grain and slab size across long road
  // strips, short access links and merged ground polygons.
  architecturalUV(asphalt,true,24);architecturalUV(paving,true)
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
  // Low planting needs a shaded leaf mass, not the full tree-crown silhouette.
  const shrubGeometry=new THREE.IcosahedronGeometry(1,1)
  const shrubPositions=shrubGeometry.getAttribute('position'),shrubColors=new Float32Array(shrubPositions.count*3)
  for(let i=0;i<shrubPositions.count;i++){
    const light=.8+(shrubPositions.getY(i)+1)*.09
    shrubColors.set([light,Math.min(1,light+.025),light*.93],i*3)
  }
  shrubGeometry.setAttribute('color',new THREE.BufferAttribute(shrubColors,3))
  // Crowns cast shadows through 100-triangle single-sided stand-ins: leaf cards are
  // invisible at shadow-map resolution, and full crowns made foliage shadows ~4x
  // the GPU cost of drawing the crowns themselves (measured 14ms vs 3ms).
  const foliageShadowGeometry = createFoliageGeometry(true)
  const foliageShadowDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
  wind(foliageShadowDepth)
  const foliageShadowProxy = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  const materials = [brick, slate, grass, parkGrass, asphalt, paving, foliage, hardCourt, timber, ballast, net, stucco, seamRoof, membrane, glazing]
  const textures = [brickMap, brickBump, slateMap, slateBump, grassMap, parkMap, asphaltMap, asphaltBump, asphaltRoughness, pavingMap, pavingBump, foliageMap, foliageBump, grassBump, parkBump, aggregateMap, aggregateBump, woodMap, netAlpha, renderMap, renderBump, metalRoofMap, metalRoofBump, membraneMap, metalRoofRoughness, membraneRoughness]
  let disposed = false

  return {
    brick, slate, grass, parkGrass, asphalt, paving, foliage, foliageGeometry, shrubGeometry, foliageDepth, hardCourt, timber, ballast, net, stucco, seamRoof, membrane, glazing,
    foliageShadowGeometry, foliageShadowDepth, foliageShadowProxy,
    wind,
    setWind(time: number, strength: number) { windTime.value = time; windStrength.value = strength },
    dispose() {
      if (disposed) return
      disposed = true
      materials.forEach(material => material.dispose())
      textures.forEach(texture => texture.dispose())
      foliageGeometry.dispose()
      shrubGeometry.dispose()
      foliageDepth.dispose()
      foliageShadowGeometry.dispose(); foliageShadowDepth.dispose(); foliageShadowProxy.dispose()
    },
  }
}
