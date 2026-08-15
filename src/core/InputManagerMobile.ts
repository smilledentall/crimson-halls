import { InputManager, type MouseDelta } from './InputManager'

/**
 * Controles mobile: herda o InputManager (joystick, botões virtuais, touch
 * para olhar) e adiciona mira por acelerômetro/giroscópio.
 *
 * O aparelho funciona como um "volante": a inclinação atual em relação à
 * posição neutra (capturada ao iniciar ou recentrada pelo jogador) vira
 * rotação da câmera. Segurar a inclinação continua girando a mira.
 */
export class InputManagerMobile extends InputManager {
  private tiltNeutral: { beta: number; gamma: number } | null = null
  private tiltLook: MouseDelta = { x: 0, y: 0 }

  /** Sensibilidade da inclinação (unidades de look por grau). */
  private readonly tiltSensitivity = 0.7

  constructor(domElement: HTMLElement, onPointerLockChange?: (locked: boolean) => void) {
    super(domElement, onPointerLockChange)
    window.addEventListener('deviceorientation', this.handleOrientation)
  }

  /** Redefine a inclinação atual como posição neutra da mira. */
  recenterTilt(): void {
    this.tiltNeutral = null
  }

  /**
   * Pede permissão de sensores no iOS (exige chamada a partir de um gesto).
   * No Android e demais navegadores os eventos já chegam sem pedido.
   */
  async requestSensorPermission(): Promise<void> {
    const orient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (typeof orient?.requestPermission === 'function') {
      await orient.requestPermission()
    }
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

  /** Soma o olhar por inclinação ao delta acumulado e zera o acumulador. */
  override consumeLookDelta(): MouseDelta {
    const base = super.consumeLookDelta()
    const result: MouseDelta = { x: base.x + this.tiltLook.x, y: base.y + this.tiltLook.y }
    this.tiltLook = { x: 0, y: 0 }
    return result
  }

  override detach(): void {
    window.removeEventListener('deviceorientation', this.handleOrientation)
    super.detach()
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}