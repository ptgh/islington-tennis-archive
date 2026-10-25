import * as THREE from 'three'

/** Normalised meshes share one centre sag at the existing miniature heights.
 * Callers keep their original width, post positions, tape thickness and UVs. */
export function createCourtNetGeometries(netHeight: number, tapeHeight: number) {
  const sag = netHeight * .16
  const net = new THREE.PlaneGeometry(1, 1, 16, 1)
  const tape = new THREE.BoxGeometry(1, 1, 1, 16, 1, 1)
  for (const geometry of [net, tape]) {
    const positions = geometry.getAttribute('position')
    for (let i=0;i<positions.count;i++) {
      const x=positions.getX(i),y=positions.getY(i),curve=1-4*x*x
      positions.setY(i,geometry===net ? y-(y+.5)*.16*curve : y-sag/tapeHeight*curve)
    }
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere()
  }
  return { net, tape, sag }
}
