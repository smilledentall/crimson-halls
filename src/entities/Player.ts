import * as THREE from 'three'
import type { CollisionSystem } from '../core/CollisionSystem'
import type { InputManager } from '../core/InputManager'
import { PLAYER_CONFIG } from './player.config'

export interface SpawnPoint {
  x: number
  z: number
  yaw: number
}

/**
 * Jogador em primeira pessoa: posição, yaw/pitch (olhar), vida e colisão.
 * O update consome o InputManager e a CollisionSystem; a engine aplica o
 * resultado na câmera via applyToCamera. Nenhuma dependência de React/Three
 * no estado interno além do Vector3 por conveniência.
 */
export class Player {
  private readonly collision: CollisionSystem
  readonly position = new THREE.Vector3()
  yaw = 0
  pitch = 0
  /** A engine atualiza estes valores a partir das configurações do store. */
  lookSensitivity: number = PLAYER_CONFIG.lookSensitivity
  invertY = false
  /** Multiplicador de velocidade (atributo Agilidade). */
  speedMultiplier = 1

  private bobPhase = 0
  private bobOffset = 0
  private moving = false

  constructor(collision: CollisionSystem) {
    this.collision = collision
  }

  spawn(spawnPoint: SpawnPoint): void {
    this.position.set(spawnPoint.x, PLAYER_CONFIG.eyeHeight, spawnPoint.z)
    this.yaw = spawnPoint.yaw
    this.pitch = 0
    this.bobPhase = 0
    this.bobOffset = 0
    this.moving = false
  }

  update(dt: number, input: InputManager): void {
    this.updateLook(input)
    this.updateMovement(dt, input)
  }

  getIsMoving(): boolean {
    return this.moving
  }

  /** Aplica posição, yaw e pitch na câmera, incluindo o "bob" ao andar. */
  applyToCamera(camera: THREE.PerspectiveCamera): void {
    camera.position.set(this.position.x, this.position.y + this.bobOffset, this.position.z)
    camera.rotation.order = 'YXZ'
    camera.rotation.y = this.yaw
    camera.rotation.x = this.pitch
  }

  private updateLook(input: InputManager): void {
    const delta = input.consumeLookDelta()
    this.yaw -= delta.x * this.lookSensitivity
    const ySign = this.invertY ? 1 : -1
    this.pitch += delta.y * this.lookSensitivity * ySign
    this.pitch = Math.max(PLAYER_CONFIG.minPitch, Math.min(PLAYER_CONFIG.maxPitch, this.pitch))
  }

  private updateMovement(dt: number, input: InputManager): void {
    // Vetor do InputManager: teclas EAXF ou joystick virtual (x+ = direita, z+ = frente).
    const move = input.getMoveVector()
    const moveX = move.x
    const moveZ = -move.z

    const sprinting = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight')
    const speed =
      PLAYER_CONFIG.moveSpeed *
      this.speedMultiplier *
      (sprinting ? PLAYER_CONFIG.sprintMultiplier : 1)

    // Direções relativas ao yaw: frente = (0,0,-1) quando yaw = 0.
    const forwardX = -Math.sin(this.yaw)
    const forwardZ = -Math.cos(this.yaw)
    const rightX = Math.cos(this.yaw)
    const rightZ = -Math.sin(this.yaw)

    let dirX = forwardX * -moveZ + rightX * moveX
    let dirZ = forwardZ * -moveZ + rightZ * moveX

    const length = Math.hypot(dirX, dirZ)
    const isMoving = length > 0.001
    if (isMoving) {
      dirX /= length
      dirZ /= length
    }

    const resolved = this.collision.resolvePosition(
      { x: this.position.x, z: this.position.z },
      { x: dirX * speed * dt, z: dirZ * speed * dt },
      PLAYER_CONFIG.radius,
    )
    this.position.x = resolved.x
    this.position.z = resolved.z

    this.moving = isMoving
    if (isMoving) {
      this.bobPhase += dt * PLAYER_CONFIG.bobFrequency
      this.bobOffset = Math.sin(this.bobPhase * Math.PI * 2) * PLAYER_CONFIG.bobAmplitude
    } else {
      this.bobOffset *= 0.85
    }
  }
}
