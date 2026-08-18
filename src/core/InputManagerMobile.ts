import { InputManager } from './InputManager'

/**
 * Controles mobile: herda o InputManager (joystick, botões virtuais, touch
 * para olhar) e ativa a mira por acelerômetro/giroscópio na criação.
 *
 * O suporte ao acelerômetro vive em `InputManager` (enableTiltLook/recenterTilt);
 * esta subclasse apenas garante que ele seja ativado em aparelhos de toque.
 */
export class InputManagerMobile extends InputManager {
  constructor(domElement: HTMLElement, onPointerLockChange?: (locked: boolean) => void) {
    super(domElement, onPointerLockChange)
    void this.enableTiltLook()
  }
}