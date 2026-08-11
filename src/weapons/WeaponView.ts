import * as THREE from 'three'

/**
 * Placeholder visual da arma na tela: um corpo + cano fixados no canto
 * inferior direito da câmera, com recuo ("recoil") e flash no cano ao
 * disparar. Será trocado por modelos reais depois, sem tocar o core.
 */
export class WeaponView {
  readonly group: THREE.Group
  private readonly flash: THREE.Sprite
  private readonly flashMaterial: THREE.SpriteMaterial
  private recoil = 0
  private readonly basePosition: THREE.Vector3

  constructor(camera: THREE.PerspectiveCamera) {
    this.group = new THREE.Group()

    const metal = new THREE.MeshStandardMaterial({
      color: 0x2b2b2e,
      roughness: 0.6,
      metalness: 0.4,
    })
    const darkMetal = new THREE.MeshStandardMaterial({
      color: 0x1c1c1f,
      roughness: 0.5,
      metalness: 0.6,
    })

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.55), metal)
    this.group.add(body)

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), darkMetal)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0.02, -0.45)
    this.group.add(barrel)

    this.flashMaterial = new THREE.SpriteMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.flash = new THREE.Sprite(this.flashMaterial)
    this.flash.position.set(0, 0.02, -0.72)
    this.flash.scale.setScalar(0.001)
    this.group.add(this.flash)

    this.basePosition = new THREE.Vector3(0.34, -0.3, -0.6)
    this.group.position.copy(this.basePosition)

    camera.add(this.group)
  }

  update(dt: number): void {
    this.recoil = Math.max(0, this.recoil - dt * 8)
    this.group.position.x = this.basePosition.x + this.recoil * 0.02
    this.group.position.y = this.basePosition.y + this.recoil * 0.02
    this.group.position.z = this.basePosition.z + this.recoil * 0.09
    this.flashMaterial.opacity = this.recoil * 0.9
    this.flash.scale.setScalar(0.001 + this.recoil * 0.22)
  }

  triggerRecoil(): void {
    this.recoil = 1
  }

  dispose(): void {
    this.flashMaterial.dispose()
    this.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const material = child.material
        if (Array.isArray(material)) material.forEach(m => m.dispose())
        else material.dispose()
      }
    })
  }
}
