import { InputManager } from './InputManager'

export class InputManagerMobile extends InputManager {
  constructor() {
    super(document.body)
    // Setup touch and accelerometer listeners
    window.addEventListener('touchstart', this.onTouchStart.bind(this))
    window.addEventListener('touchmove', this.onTouchMove.bind(this))
    window.addEventListener('devicemotion', this.onDeviceMotion.bind(this))
  }

  private onTouchStart(_event: TouchEvent) {
    // Handle touch start
  }

  private onTouchMove(_event: TouchEvent) {
    // Handle touch move
  }

  private onDeviceMotion(_event: DeviceMotionEvent) {
    // Handle accelerometer data
  }
}
