import * as THREE from 'three'

/** Fit directional shadow texels to the visible ground/building volume.
 * Shadow-space bounds also retain off-screen casters whose shadows reach it.
 * The town's tallest miniature is 36 units; 60 leaves headroom for roofs/trees. */
export function createViewShadowFitter() {
  const direction=new THREE.Vector3(),point=new THREE.Vector3()
  return (light:THREE.DirectionalLight,view:THREE.OrthographicCamera)=>{
    view.updateWorldMatrix(true,false)
    view.getWorldDirection(direction)
    if(Math.abs(direction.y)<1e-4)return false
    light.updateWorldMatrix(true,false);light.target.updateWorldMatrix(true,false)
    light.shadow.updateMatrices(light)
    const shadow=light.shadow.camera
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity
    for(const height of [-.2,60])for(const x of [-1,1])for(const y of [-1,1]){
      point.set(x,y,-1).unproject(view)
      point.addScaledVector(direction,(height-point.y)/direction.y).applyMatrix4(shadow.matrixWorldInverse)
      left=Math.min(left,point.x);right=Math.max(right,point.x)
      bottom=Math.min(bottom,point.y);top=Math.max(top,point.y)
    }
    if(![left,right,bottom,top].every(Number.isFinite))return false
    let centreX=(left+right)/2,centreY=(bottom+top)/2
    const halfWidth=Math.max(32,(right-left)/2+12),halfHeight=Math.max(32,(top-bottom)/2+12)
    // Anchor the texel grid in world space. Without this, following the camera
    // makes fine fence/tree shadows crawl even during very small pans.
    point.set(0,0,0).applyMatrix4(shadow.matrixWorldInverse)
    const texelX=halfWidth*2/light.shadow.mapSize.x,texelY=halfHeight*2/light.shadow.mapSize.y
    centreX=point.x+Math.round((centreX-point.x)/texelX)*texelX
    centreY=point.y+Math.round((centreY-point.y)/texelY)*texelY
    shadow.left=centreX-halfWidth;shadow.right=centreX+halfWidth
    shadow.bottom=centreY-halfHeight;shadow.top=centreY+halfHeight
    shadow.updateProjectionMatrix()
    return true
  }
}
