import * as THREE from 'three'

export interface RocketConfig {
  origin: THREE.Vector3
  direction: THREE.Vector3
  speed: number
  /** Andar a que o foguete pertence — colide/explode só nesse andar. */
  floorId?: string
}

const MAX_LIFETIME = 4

/**
 * Foguete do lançador: viaja em linha reta até bater em parede/inimigo
 * ou esgotar o tempo de vida. A explosão (splash + self-damage) é tratada
 * pela engine via explodeAt.
 */
export class Rocket {
  readonly mesh: THREE.Mesh
  readonly velocity: THREE.Vector3
  /** Andar a que o foguete pertence ('' = andar único). */
  readonly floorId: string
  alive = true

  private lifetime = MAX_LIFETIME

  constructor(config: RocketConfig) {
    this.floorId = config.floorId ?? ''
    const material = new THREE.MeshStandardMaterial({
      color: 0x6a6a72,
      emissive: 0xff5533,
      emissiveIntensity: 1.2,
    })
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), material)
    this.mesh.position.copy(config.origin)

    const direction = config.direction.clone().normalize()
    this.velocity = direction.multiplyScalar(config.speed)
    this.mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, -1),
      this.velocity.clone().normalize(),
    )
  }

  update(dt: number): void {
    if (!this.alive) return
    this.lifetime -= dt
    this.mesh.position.addScaledVector(this.velocity, dt)
    if (this.lifetime <= 0) this.alive = false
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    const material = this.mesh.material
    if (Array.isArray(material)) material.forEach(m => m.dispose())
    else material.dispose()
  }
}
