import * as THREE from 'three'
import { useGameStore } from '../state/gameStore'
import { getSpriteEntry } from '../core/SpriteLoader'
import type { WeaponId } from './weapons.config'
import { WEAPON_SPRITE_URLS } from './weaponSprites'

/**
 * Visual da arma em primeira pessoa: um único plano fixo ancorado na câmera
 * (canto inferior direito) exibindo a imagem da arma equipada. O fundo verde
 * das imagens é removido pelo mesmo processo usado nos inimigos (SpriteLoader).
 * Ao trocar de arma só trocamos a textura do material — sem criar 5 objetos.
 */

interface WeaponFrameConfig {
  /** Altura do sprite em unidades de mundo (largura = altura × aspect). */
  height: number
  /** Offset de posição do plano relativo ao ancoramento base. */
  offsetX?: number
  offsetY?: number
  offsetZ?: number
  /** Rotação do plano no eixo Z (radianos), para alinhar o enquadramento. */
  rotationZ?: number
  /** Posição do cano (muzzle flash) relativa ao ancoramento base. */
  flashX?: number
  flashY?: number
  flashZ?: number
}

/** Ajuste individual por arma para a troca (1-5) não parecer um salto. */
const FRAME: Record<WeaponId, WeaponFrameConfig> = {
  pistol: {
    height: 0.42,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    rotationZ: 0,
    flashX: 0,
    flashY: 0.06,
    flashZ: -0.6,
  },
  shotgun: {
    height: 0.5,
    offsetX: 0,
    offsetY: -0.02,
    offsetZ: 0,
    rotationZ: 0,
    flashX: 0,
    flashY: 0.04,
    flashZ: -0.62,
  },
  rifle: {
    height: 0.48,
    offsetX: 0,
    offsetY: -0.01,
    offsetZ: 0,
    rotationZ: 0,
    flashX: 0,
    flashY: 0.05,
    flashZ: -0.62,
  },
  rocket: {
    height: 0.44,
    offsetX: 0,
    offsetY: 0.02,
    offsetZ: 0,
    rotationZ: 0,
    flashX: 0,
    flashY: 0.03,
    flashZ: -0.66,
  },
  chainsaw: {
    height: 0.5,
    offsetX: 0,
    offsetY: -0.02,
    offsetZ: 0,
    rotationZ: 0,
    flashX: 0,
    flashY: 0.02,
    flashZ: -0.58,
  },
}

export class WeaponView {
  readonly group: THREE.Group
  private readonly plane: THREE.Mesh
  private readonly planeMaterial: THREE.MeshBasicMaterial
  private readonly flash: THREE.Sprite
  private readonly flashMaterial: THREE.SpriteMaterial
  private recoil = 0
  private lastWeaponId: WeaponId | null = null
  private readonly basePosition: THREE.Vector3

  constructor(camera: THREE.PerspectiveCamera) {
    this.group = new THREE.Group()

    // Um único plano + material: a textura muda conforme a arma equipada.
    this.planeMaterial = new THREE.MeshBasicMaterial({
      map: null,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })
    this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.planeMaterial)
    this.plane.renderOrder = 999
    this.plane.scale.set(0.5, 0.5, 1)
    this.group.add(this.plane)

    this.flashMaterial = new THREE.SpriteMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    })
    this.flash = new THREE.Sprite(this.flashMaterial)
    this.flash.renderOrder = 1000
    this.flash.scale.setScalar(0.001)
    this.group.add(this.flash)

    this.basePosition = new THREE.Vector3(0.34, -0.3, -0.6)
    this.group.position.copy(this.basePosition)

    camera.add(this.group)
    this.applyWeapon(useGameStore.getState().currentWeaponId)
  }

  /** Troca a textura/escala/posição para a arma dada (sem recriar o plano). */
  private applyWeapon(weaponId: WeaponId): void {
    const frame = FRAME[weaponId]
    const url = WEAPON_SPRITE_URLS[weaponId]
    const entry = getSpriteEntry(url)

    this.planeMaterial.map = entry?.texture ?? null
    this.planeMaterial.needsUpdate = true

    const height = frame.height
    const width = height * (entry?.aspect ?? 1)
    this.plane.scale.set(width, height, 1)
    this.plane.position.set(
      this.basePosition.x + (frame.offsetX ?? 0),
      this.basePosition.y + (frame.offsetY ?? 0),
      this.basePosition.z + (frame.offsetZ ?? 0),
    )
    this.plane.rotation.z = frame.rotationZ ?? 0

    this.flash.position.set(
      this.basePosition.x + (frame.flashX ?? 0),
      this.basePosition.y + (frame.flashY ?? 0),
      this.basePosition.z + (frame.flashZ ?? 0),
    )
  }

  update(dt: number): void {
    const weaponId = useGameStore.getState().currentWeaponId
    // Reaplica quando a textura ainda não estava pronta (pré-load assíncrono).
    if (this.planeMaterial.map === null && this.lastWeaponId === null) {
      this.applyWeapon(weaponId)
    }
    if (weaponId !== this.lastWeaponId) {
      this.lastWeaponId = weaponId
      this.applyWeapon(weaponId)
    }

    // Recuo: empurra o grupo para trás/baixo e anima o flash do cano.
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
    this.planeMaterial.dispose()
    this.plane.geometry.dispose()
  }
}
