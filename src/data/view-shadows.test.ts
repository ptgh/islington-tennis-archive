import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createViewShadowFitter} from '../scene/viewShadows.ts'

test('fitted shadows cover the visible ground and roofs across zoom, aspect, orbit and sun direction',()=>{
  const fit=createViewShadowFitter(),light=new THREE.DirectionalLight()
  light.shadow.camera.far=2400
  for(const aspect of [.46,1.6,2.4])for(const zoom of [.55,2.1,18,60])for(const azimuth of [0,.9,2.8])for(const sun of [[-240,300,185],[200,50,-280]]){
    const target=new THREE.Vector3(110,0,-32)
    const view=new THREE.OrthographicCamera(-210*aspect,210*aspect,210,-210,1,2400)
    view.position.copy(target).add(new THREE.Vector3(Math.sin(azimuth)*550,480,Math.cos(azimuth)*550));view.lookAt(target);view.zoom=zoom;view.updateProjectionMatrix()
    light.position.copy(target).add(new THREE.Vector3(...sun));light.target.position.copy(target)
    assert.equal(fit(light,view),true)
    light.shadow.updateMatrices(light)
    const direction=view.getWorldDirection(new THREE.Vector3())
    for(const height of [-.2,36,60])for(const x of [-1,1])for(const y of [-1,1]){
      const point=new THREE.Vector3(x,y,-1).unproject(view)
      point.addScaledVector(direction,(height-point.y)/direction.y)
      // A caster displaced along the light ray has the same shadow projection.
      for(const upstream of [0,30]){
        const projected=point.clone().addScaledVector(new THREE.Vector3(...sun).normalize(),upstream).project(light.shadow.camera)
        assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'visible receivers and their casters stay inside the shadow map')
      }
    }
  }
})

test('neighbourhood fit increases texel density and a horizontal view retains safe fallback bounds',()=>{
  const fit=createViewShadowFitter(),light=new THREE.DirectionalLight(),view=new THREE.OrthographicCamera(-336,336,210,-210,1,2400)
  view.position.set(275,480,475);view.lookAt(0,0,0);view.zoom=2.1;view.updateProjectionMatrix();light.position.set(-240,300,185)
  assert.equal(fit(light,view),true)
  const shadow=light.shadow.camera,bounds=[shadow.left,shadow.right,shadow.bottom,shadow.top]
  const formerArea=(1040/Math.sqrt(view.zoom))**2
  assert.ok((shadow.right-shadow.left)*(shadow.top-shadow.bottom)<formerArea*.5)
  view.position.set(100,0,0);view.lookAt(0,0,0)
  assert.equal(fit(light,view),false)
  assert.deepEqual([shadow.left,shadow.right,shadow.bottom,shadow.top],bounds)
})

test('small camera pans retain a world-anchored shadow texel grid',()=>{
  const fit=createViewShadowFitter(),light=new THREE.DirectionalLight(),view=new THREE.OrthographicCamera(-336,336,210,-210,1,2400)
  light.shadow.mapSize.set(4096,4096)
  view.position.set(275,480,475);view.lookAt(0,0,0);view.zoom=2.1;view.updateProjectionMatrix();light.position.set(-240,300,185)
  const projected=()=>{fit(light,view);light.shadow.updateMatrices(light);return new THREE.Vector3(40,0,20).project(light.shadow.camera)}
  const before=projected(),movement=new THREE.Vector3(.0001,0,.0001)
  view.position.add(movement);light.position.add(movement);light.target.position.add(movement)
  const after=projected()
  assert.ok(Math.abs(before.x-after.x)<1e-9&&Math.abs(before.y-after.y)<1e-9,'a sub-texel pan does not drag the shadow grid')
})

test('metre-scale club close-ups retain roof shadows when panning away from the fixed sun target',()=>{
  const fit=createViewShadowFitter(),light=new THREE.DirectionalLight()
  light.shadow.mapSize.set(4096,4096)
  light.position.set(-400,600,450)
  light.shadow.camera.far=1600
  for(const aspect of [.46,1.6])for(const target of [new THREE.Vector3(-149,0,82),new THREE.Vector3(173,0,27)]){
    const span=Math.max(430,(aspect<1?560:620)/aspect)
    const view=new THREE.OrthographicCamera(-span*aspect/2,span*aspect/2,span/2,-span/2,.5,2400)
    view.position.copy(target).add(new THREE.Vector3(420,510,680));view.lookAt(target)
    view.zoom=4;view.updateProjectionMatrix()
    assert.equal(fit(light,view),true)
    light.shadow.updateMatrices(light)
    const shadow=light.shadow.camera
    assert.ok((shadow.right-shadow.left)*(shadow.top-shadow.bottom)<860*960,'close-up texels are concentrated without increasing the texture budget')
    const direction=view.getWorldDirection(new THREE.Vector3())
    for(const height of [0,30,60])for(const x of [-1,1])for(const y of [-1,1]){
      const point=new THREE.Vector3(x,y,-1).unproject(view)
      point.addScaledVector(direction,(height-point.y)/direction.y).project(shadow)
      assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1&&Math.abs(point.z)<1,'visible club roofs and ground retain shadow coverage')
    }
  }
})
