import * as THREE from 'three'
import type { CollisionSystem } from '../core/CollisionSystem'

export interface ProjectileConfig {
  origin: THREE.Vector3
  target: THREE.Vector3
  speed: number
  damage: number
}

const RADIUS = 0.15
const MAX_LIFETIME = 5
const MAX_DISTANCE = 80

/**
 * Projétil disparado por inimigos à distância: viaja em linha reta,
 * morre ao bater em parede ou estourar o tempo de vida.
 * A colisão com o jogador é verificada pela engine.
 */
export class Projectile {
  readonly mesh: THREE.Mesh
  readonly velocity = new THREE.Vector3()
  readonly damage: number
  alive = true

  private lifetime = MAX_LIFETIME
  private distanceTravelled = 0

  constructor(config: ProjectileConfig) {
    this.damage = config.damage

    const material = new THREE.MeshStandardMaterial({
      color: 0xff5533,
      emissive: 0xff2200,
      emissiveIntensity: 1.2,
    })
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), material)
    this.mesh.position.copy(config.origin)

    const direction = new THREE.Vector3().subVectors(config.target, config.origin).normalize()
    this.velocity.copy(direction).multiplyScalar(config.speed)
  }

  update(dt: number, collision: CollisionSystem): void {
    if (!this.alive) return
    const step = dt * this.velocity.length()
    this.lifetime -= dt
    this.distanceTravelled += step
    this.mesh.position.addScaledVector(this.velocity, dt)

    if (this.lifetime <= 0 || this.distanceTravelled >= MAX_DISTANCE) {
      this.alive = false
      return
    }
    if (collision.isBlocked(this.mesh.position.x, this.mesh.position.z, RADIUS)) {
      this.alive = false
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    const material = this.mesh.material
    if (Array.isArray(material)) material.forEach(m => m.dispose())
    else material.dispose()
  }
}
