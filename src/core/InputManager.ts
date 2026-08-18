import { isTouchDevice } from './device'

/**
 * Gerencia teclado, mouse (incluindo Pointer Lock) e entrada virtual de
 * touch (joystick, arrastar para olhar, botão de tiro), além de mira por
 * acelerômetro/giroscópio (controles mobile).
 * A engine apenas consulta este módulo; ele não depende de React nem da engine.
 */

export interface InputVector {
  x: number
  z: number
}

export interface MouseDelta {
  x: number
  y: number
}

const JOYSTICK_DEADZONE = 0.15

export class InputManager {
  private readonly keysDown = new Set<string>()
  private readonly mouseButtons = new Set<number>()
  private mouseDelta: MouseDelta = { x: 0, y: 0 }
  private pointerLocked = false
  private readonly domElement: HTMLElement
  private readonly onPointerLockChange?: (locked: boolean) => void

  // Entrada virtual (controles touch alimentados pelo React/UI).
  private virtualMove: InputVector = { x: 0, z: 0 }
  private virtualLook: MouseDelta = { x: 0, y: 0 }
  private virtualFireHeld = false

  // Mira por acelerômetro/giroscópio (mobile): o aparelho funciona como um
  // "volante" — a inclinação em relação à posição neutra vira rotação da
  // câmera. Segurar a inclinação continua girando a mira.
  private tiltLookEnabled = false
  private tiltNeutral: { beta: number; gamma: number } | null = null
  private tiltLook: MouseDelta = { x: 0, y: 0 }

  /** Sensibilidade da inclinação (unidades de look por grau). */
  private readonly tiltSensitivity = 0.7

  constructor(domElement: HTMLElement, onPointerLockChange?: (locked: boolean) => void) {
    this.domElement = domElement
    this.onPointerLockChange = onPointerLockChange
    this.attachListeners()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    this.keysDown.add(event.code)
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.code)
  }

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) return
    this.mouseDelta.x += event.movementX
    this.mouseDelta.y += event.movementY
  }

  private readonly handleMouseDown = (event: MouseEvent): void => {
    // Em dispositivos touch, os eventos de mouse sintéticos (toque→click)
    // não devem contar como tiro — o botão virtual cuida disso.
    if (isTouchDevice()) return
    this.mouseButtons.add(event.button)
  }

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (isTouchDevice()) return
    this.mouseButtons.delete(event.button)
  }

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
  }

  private readonly handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.domElement
    this.onPointerLockChange?.(this.pointerLocked)
  }

  private readonly handleClick = (): void => {
    // Clicar no canvas re-adquire o Pointer Lock (segurança exige gesto do usuário).
    if (!this.pointerLocked && !isTouchDevice()) this.requestPointerLock()
  }

  private readonly handleOrientation = (event: DeviceOrientationEvent): void => {
    const beta = event.beta ?? 0
    const gamma = event.gamma ?? 0
    if (!this.tiltNeutral) this.tiltNeutral = { beta, gamma }
    const dGamma = gamma - this.tiltNeutral.gamma
    const dBeta = beta - this.tiltNeutral.beta
    // gamma: inclinar para os lados gira a câmera (horizontal).
    // beta: inclinar para frente/trás olha para cima/baixo.
    this.tiltLook.x = clamp(dGamma * this.tiltSensitivity, -3, 3)
    this.tiltLook.y = clamp(-dBeta * this.tiltSensitivity, -3, 3)
  }

  private attachListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
    document.addEventListener('pointerlockchange', this.handlePointerLockChange)
    this.domElement.addEventListener('mousedown', this.handleMouseDown)
    this.domElement.addEventListener('click', this.handleClick)
    this.domElement.addEventListener('contextmenu', this.handleContextMenu)
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange)
    this.domElement.removeEventListener('mousedown', this.handleMouseDown)
    this.domElement.removeEventListener('click', this.handleClick)
    this.domElement.removeEventListener('contextmenu', this.handleContextMenu)
    if (this.tiltLookEnabled) {
      window.removeEventListener('deviceorientation', this.handleOrientation)
    }
  }

  isKeyDown(code: string): boolean {
    return this.keysDown.has(code)
  }

  isMouseDown(button: number): boolean {
    return this.mouseButtons.has(button)
  }

  /**
   * Vetor de movimento: joystick virtual (touch) tem prioridade quando ativo;
   * senão, as teclas (WASD: W=frente, A=esquerda, S=trás, D=direita).
   * Retorna { x, z } com x+ = direita e z+ = frente.
   */
  getMoveVector(): InputVector {
    const jx = this.virtualMove.x
    const jz = this.virtualMove.z
    if (Math.hypot(jx, jz) > JOYSTICK_DEADZONE) {
      return { x: clamp(jx, -1, 1), z: clamp(jz, -1, 1) }
    }
    const x = (this.isKeyDown('KeyD') ? 1 : 0) - (this.isKeyDown('KeyA') ? 1 : 0)
    const z = (this.isKeyDown('KeyW') ? 1 : 0) - (this.isKeyDown('KeyS') ? 1 : 0)
    return { x, z }
  }

  /** Lê e zera o acumulado de olhar (mouse + arrasto de touch + inclinação). */
  consumeLookDelta(): MouseDelta {
    const delta = {
      x: this.mouseDelta.x + this.virtualLook.x + this.tiltLook.x,
      y: this.mouseDelta.y + this.virtualLook.y + this.tiltLook.y,
    }
    this.mouseDelta = { x: 0, y: 0 }
    this.virtualLook = { x: 0, y: 0 }
    this.tiltLook = { x: 0, y: 0 }
    return delta
  }

  isVirtualFire(): boolean {
    return this.virtualFireHeld
  }

  /** Verifica se a tecla de escudo (Q) foi pressionada neste frame. */
  isShieldKeyDown(): boolean {
    return this.keysDown.has('KeyQ')
  }

  // ---- Mira por acelerômetro/giroscópio (mobile) ----

  /** Ativa a mira por inclinação: registra o listener e pede permissão (iOS). */
  async enableTiltLook(): Promise<void> {
    if (this.tiltLookEnabled) return
    this.tiltLookEnabled = true
    window.addEventListener('deviceorientation', this.handleOrientation)
    const orient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof orient?.requestPermission === 'function') {
      await orient.requestPermission()
    }
  }

  /** Redefine a inclinação atual como posição neutra da mira. */
  recenterTilt(): void {
    this.tiltNeutral = null
  }

  isTiltLookEnabled(): boolean {
    return this.tiltLookEnabled
  }

  // ---- Bridge para os controles virtuais (touch) ----

  setVirtualMove(x: number, z: number): void {
    this.virtualMove = { x, z }
  }

  addVirtualLook(dx: number, dy: number): void {
    this.virtualLook.x += dx
    this.virtualLook.y += dy
  }

  setVirtualFire(held: boolean): void {
    this.virtualFireHeld = held
  }

  requestPointerLock(): void {
    if (isTouchDevice()) return
    this.domElement.requestPointerLock()
  }

  exitPointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock()
  }

  isPointerLocked(): boolean {
    return this.pointerLocked
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}