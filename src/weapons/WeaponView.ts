import * as THREE from 'three'
import { useGameStore } from '../state/gameStore'
import { getSpriteEntry } from '../core/SpriteLoader'
import type { WeaponId } from './weapons.config'
import { WEAPON_SPRITE_URLS } from './weaponSprites'

/**
 * Visual da arma em primeira pessoa: um único plano fixo ancorado na câmera
 * (centro inferior, estilo Doom) exibindo a imagem da arma equipada com o
 * cano apontando na direção da mira central. O fundo verde das imagens é
 * removido pelo mesmo processo usado nos inimigos (SpriteLoader).
 * Ao trocar de arma só trocamos a textura do material — sem criar 5 objetos.
 * O plano é filho direto do grupo ancorado na câmera e fica SEMPRE com rotação
 * identidade (0,0,0): reto, de frente para a câmera, sem billboard dinâmico.
 */

interface WeaponFrameConfig {
  /** Altura do sprite em unidades de mundo (largura = altura × aspect). */
  height: number
  /** Ajuste fino de posição do plano relativo ao ancoramento base. */
  offsetX?: number
  offsetY?: number
  offsetZ?: number
  /** Posição do cano (muzzle flash) relativa ao ancoramento base. */
  flashX?: number
  flashY?: number
  flashZ?: number
}

/** Ajuste individual por arma: mesmo enquadramento centralizado na base. */
const FRAME: Record<WeaponId, WeaponFrameConfig> = {
  pistol: {
    height: 0.4,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    flashX: 0,
    flashY: 0.14,
    flashZ: -0.16,
  },
  shotgun: {
    height: 0.4,
    offsetX: 0,
    offsetY: -0.01,
    offsetZ: 0,
    flashX: 0,
    flashY: 0.12,
    flashZ: -0.16,
  },
  rifle: {
    height: 0.4,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    flashX: 0,
    flashY: 0.13,
    flashZ: -0.16,
  },
  rocket: {
    height: 0.4,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    flashX: 0,
    flashY: 0.12,
    flashZ: -0.18,
  },
  chainsaw: {
    height: 0.4,
    offsetX: 0,
    offsetY: -0.01,
    offsetZ: 0,
    flashX: 0,
    flashY: 0.12,
    flashZ: -0.16,
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
    // Rotação identidade: o plano fica sempre reto, de frente para a câmera.
    this.plane.rotation.set(0, 0, 0)
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

    this.basePosition = new THREE.Vector3(0.05, -0.2, -0.55)
    // O grupo carrega o ancoramento; o plano/flash ficam na origem + ajustes.
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
      frame.offsetX ?? 0,
      frame.offsetY ?? 0,
      frame.offsetZ ?? 0,
    )
    this.plane.rotation.set(0, 0, 0)

    this.flash.position.set(
      frame.flashX ?? 0,
      frame.flashY ?? 0,
      frame.flashZ ?? 0,
    )
  }

  update(dt: number): void {
    const weaponId = useGameStore.getState().currentWeaponId
    const url = WEAPON_SPRITE_URLS[weaponId]
    const entry = getSpriteEntry(url)
    const texture = entry?.texture ?? null
    // Aplica quando troca de arma OU quando a textura do sprite fica pronta
    // (pré-load assíncrono): sem isso, a arma inicial nasce em branco e só
    // "acende" após uma troca manual de arma.
    if (weaponId !== this.lastWeaponId || (texture !== null && this.planeMaterial.map !== texture)) {
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
