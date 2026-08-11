import * as THREE from 'three'

export type PickupKind = 'health' | 'ammo' | 'currency'

export interface PickupDefinition {
  kind: PickupKind
  x: number
  z: number
}

const COLLECT_DURATION = 0.2

/**
 * Pickup de vida/munição com visual flutuante e giratório.
 * A coleta em si (dano/estado) é feita pela engine ao detectar proximidade;
 * aqui só existe a entidade visual + dados + animação de coleta ("pop").
 */
export class Pickup {
  readonly definition: PickupDefinition
  readonly mesh: THREE.Group
  collected = false

  private bobPhase: number
  private collectTimer = 0

  constructor(definition: PickupDefinition) {
    this.definition = definition
    this.bobPhase = Math.random() * Math.PI * 2

    const isHealth = definition.kind === 'health'
    const isCurrency = definition.kind === 'currency'
    const material = new THREE.MeshStandardMaterial({
      color: isHealth ? 0x2ee07a : isCurrency ? 0xffb04a : 0xffd24a,
      emissive: isHealth ? 0x0f7a3d : isCurrency ? 0x9a6a1f : 0x9a7a1f,
      emissiveIntensity: 0.8,
    })

    this.mesh = new THREE.Group()

    if (isHealth) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), material)
      this.mesh.add(cube)
      const crossMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.7,
      })
      const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.44, 0.09), crossMat)
      const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.09), crossMat)
      this.mesh.add(vertical, horizontal)
    } else if (isCurrency) {
      // Núcleo: octaedro dourado brilhante.
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), material)
      this.mesh.add(gem)
      const inner = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.1, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffe6a0,
          emissive: 0xffcf6a,
          emissiveIntensity: 0.9,
        }),
      )
      this.mesh.add(inner)
    } else {
      // Munição: um "carregador" de arma deitado.
      const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.36, 0.1), material)
      this.mesh.add(magazine)
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.36, 0.04),
        new THREE.MeshStandardMaterial({
          color: 0x8c8c94,
          emissive: 0x4a4a50,
          emissiveIntensity: 0.5,
        }),
      )
      tip.position.z = -0.07
      this.mesh.add(tip)
    }

    this.mesh.position.set(definition.x, 0.55, definition.z)
  }

  update(dt: number): void {
    if (this.collected) {
      // Animação de coleta: cresce e some rapidamente.
      this.collectTimer -= dt
      const t = Math.max(0, this.collectTimer / COLLECT_DURATION)
      this.mesh.scale.setScalar(1 + (1 - t) * 0.6)
      this.mesh.rotation.y += dt * 6
      return
    }
    this.mesh.rotation.y += dt * 1.8
    this.mesh.position.y = 0.55 + Math.sin(this.bobPhase) * 0.08
    this.bobPhase += dt * 2.5
  }

  /** Inicia a animação de coleta. */
  collect(): void {
    if (this.collected) return
    this.collected = true
    this.collectTimer = COLLECT_DURATION
  }

  readyForRemoval(): boolean {
    return this.collected && this.collectTimer <= 0
  }

  dispose(): void {
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const material = child.material
        if (Array.isArray(material)) material.forEach(m => m.dispose())
        else material.dispose()
      }
    })
  }
}
