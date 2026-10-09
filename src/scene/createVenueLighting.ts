import * as THREE from 'three'

// Confirmed sports lighting only. Fixture spacing is an illustration, not an
// installation survey or live operating schedule.
// Centre: https://assets.lutron.com/a/documents/Wimbledon_US_Letter_English.pdf
// No.1: https://www.wimbledon.com/pdf/Ticket_Holders_Guide_2019.pdf
export function createVenueLighting() {
  const root = new THREE.Group(), lights: THREE.SpotLight[] = []
  const geometry = new THREE.BoxGeometry(1.5, .3, .65)
  const lamp = new THREE.MeshStandardMaterial({ color: '#eee9dc', emissive: '#fff6e4', emissiveIntensity: 0 })
  function add(venue: string, court: string, x: number, z: number, angle: number) {
    if (venue !== 'wimbledon' || !['centre', 'number-one'].includes(court)) return
    const group = new THREE.Group()
    group.position.set(x, 0, z); group.rotation.y = angle; root.add(group)
    const centre = court === 'centre', mountX = centre ? 32 : 29, height = centre ? 18.4 : 16.7
    for (const side of [-1, 1]) {
      for (const offset of [-18, -9, 0, 9, 18]) {
        const head = new THREE.Mesh(geometry, lamp)
        head.position.set(side * mountX, height, offset)
        head.rotation.z = side * .45
        group.add(head)
      }
      // Broad, overlapping sources approximate the banks of roof fittings. No extra
      // shadow maps: the sun/moon remains the shared shadow-casting source.
      for (const end of [-1, 1]) {
        const light = new THREE.SpotLight('#fff5e2', 0, 75, .85, .6, 2)
        light.position.set(side * mountX, height, end * 16)
        light.target.position.set(0, .25, end * 6)
        group.add(light, light.target); lights.push(light)
      }
    }
  }
  return { root, add, setNight(night: boolean) {
    lamp.emissiveIntensity = night ? 3 : 0
    for (const light of lights) light.intensity = night ? 1700 : 0
  }, dispose() { geometry.dispose(); lamp.dispose() } }
}
