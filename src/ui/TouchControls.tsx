import { useRef } from 'react'
import type { Engine } from '../core/Engine'
import { useGameStore } from '../state/gameStore'
import { WEAPON_ORDER } from '../weapons/weapons.config'

const STICK_RADIUS = 54

/**
 * Controles virtuais para telas touch:
 * - Joystick na metade esquerda (movimento, analógico).
 * - Arrastar na metade direita (olhar/mirar).
 * - Botão de tiro e botão de troca de arma.
 * Os valores são empurrados para a engine via bridge (sem lógica de jogo aqui).
 */
export function TouchControls({ engine }: { engine: Engine }) {
  const equipWeapon = useGameStore(state => state.equipWeapon)
  const currentWeaponId = useGameStore(state => state.currentWeaponId)

  const stickBaseRef = useRef<HTMLDivElement>(null)
  const stickKnobRef = useRef<HTMLDivElement>(null)
  const stickPointer = useRef<number | null>(null)
  const stickOrigin = useRef({ x: 0, y: 0 })
  const lookPointer = useRef<number | null>(null)
  const lookLast = useRef({ x: 0, y: 0 })

  const updateStick = (clientX: number, clientY: number) => {
    let dx = clientX - stickOrigin.current.x
    let dy = clientY - stickOrigin.current.y
    const length = Math.hypot(dx, dy)
    if (length > STICK_RADIUS) {
      dx = (dx / length) * STICK_RADIUS
      dy = (dy / length) * STICK_RADIUS
    }
    stickKnobRef.current?.style.setProperty('transform', `translate(${dx}px, ${dy}px)`)
    // z+ = frente → arrastar para cima (dy negativo) = mover para frente.
    engine.setTouchMove(dx / STICK_RADIUS, -dy / STICK_RADIUS)
  }

  const handleStickDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointer.current !== null) return
    stickPointer.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    stickOrigin.current = { x: event.clientX, y: event.clientY }
    stickBaseRef.current?.style.setProperty('opacity', '1')
    stickBaseRef.current?.style.setProperty('left', `${event.clientX}px`)
    stickBaseRef.current?.style.setProperty('top', `${event.clientY}px`)
    updateStick(event.clientX, event.clientY)
  }

  const handleStickMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== stickPointer.current) return
    updateStick(event.clientX, event.clientY)
  }

  const handleStickEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== stickPointer.current) return
    stickPointer.current = null
    engine.setTouchMove(0, 0)
    stickBaseRef.current?.style.setProperty('opacity', '0')
    stickKnobRef.current?.style.setProperty('transform', 'translate(0px, 0px)')
  }

  const handleLookDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointer.current !== null) return
    lookPointer.current = event.pointerId
    lookLast.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleLookMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== lookPointer.current) return
    const dx = event.clientX - lookLast.current.x
    const dy = event.clientY - lookLast.current.y
    lookLast.current = { x: event.clientX, y: event.clientY }
    engine.addTouchLook(dx, dy)
  }

  const handleLookEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerId === lookPointer.current) lookPointer.current = null
  }

  const cycleWeapon = () => {
    const index = WEAPON_ORDER.indexOf(currentWeaponId)
    equipWeapon(WEAPON_ORDER[(index + 1) % WEAPON_ORDER.length])
  }

  return (
    <div className="touch-controls">
      <div
        className="touch-zone touch-zone-left"
        onPointerDown={handleStickDown}
        onPointerMove={handleStickMove}
        onPointerUp={handleStickEnd}
        onPointerCancel={handleStickEnd}
      >
        <div ref={stickBaseRef} className="touch-stick-base" aria-hidden="true">
          <div ref={stickKnobRef} className="touch-stick-knob" />
        </div>
      </div>

      <div
        className="touch-zone touch-zone-right"
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookEnd}
        onPointerCancel={handleLookEnd}
      />

      <button
        className="touch-button touch-fire"
        onPointerDown={event => {
          event.preventDefault()
          engine.setTouchFire(true)
        }}
        onPointerUp={() => engine.setTouchFire(false)}
        onPointerLeave={() => engine.setTouchFire(false)}
        onPointerCancel={() => engine.setTouchFire(false)}
      >
        FOGO
      </button>

      <button
        className="touch-button touch-weapon"
        onPointerDown={event => event.preventDefault()}
        onClick={cycleWeapon}
      >
        ARMA
      </button>

      <button
        className="touch-button touch-recenter"
        onPointerDown={event => event.preventDefault()}
        onClick={() => engine.recenterTilt()}
      >
        MIRA
      </button>

      <button
        className="touch-button touch-flashlight"
        onPointerDown={event => event.preventDefault()}
        onClick={() => engine.toggleFlashlight()}
      >
        LANTERNA
      </button>
    </div>
  )
}
