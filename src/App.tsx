import { useEffect, useRef } from 'react'
import type { Engine } from './core/Engine'
import { isTouchDevice } from './core/device'
import { useGameStore } from './state/gameStore'
import { DeathScreen } from './ui/DeathScreen'
import { Epilogue } from './ui/Epilogue'
import { HUD } from './ui/HUD'
import { LevelEditor } from './ui/LevelEditor'
import { LevelIntro } from './ui/LevelIntro'
import { LevelTransition } from './ui/LevelTransition'
import { MainMenu } from './ui/MainMenu'
import { NoteModal } from './ui/NoteModal'
import { PauseMenu } from './ui/PauseMenu'
import { Settings } from './ui/Settings'
import { TouchControls } from './ui/TouchControls'
import { Upgrades } from './ui/Upgrades'

interface AppProps {
  engine: Engine
}

/**
 * Camada visual: o <canvas> do Three.js vive dentro do container e a UI
 * React fica por cima. React só lê o store e dispara ações — todo o jogo
 * (loop, física, input) roda na Engine.
 */
export function App({ engine }: AppProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const phase = useGameStore(state => state.phase)
  const fade = useGameStore(state => state.fade)

  useEffect(() => {
    const container = containerRef.current
    if (container && !engine.isInitialized()) {
      engine.init(container)
      if (isTouchDevice()) engine.enableTiltLook()
    }
    return () => {
      engine.dispose()
    }
  }, [engine])

  useEffect(() => {
    if (minimapRef.current) engine.attachMinimap(minimapRef.current)
  }, [engine])

  return (
    <div className="app">
      <div ref={containerRef} className="game-canvas" />
      <div className="ui-overlay">
        <canvas ref={minimapRef} className="minimap" />
        {phase === 'menu' && <MainMenu />}
        {(phase === 'playing' || phase === 'paused') && <HUD />}
        {phase === 'paused' && <PauseMenu />}
        {phase === 'gameover' && <DeathScreen />}
        {phase === 'victory' && <LevelTransition />}
        {phase === 'editor' && <LevelEditor />}
        {phase === 'settings' && <Settings />}
        {phase === 'upgrade' && <Upgrades />}
        {isTouchDevice() && (phase === 'playing' || phase === 'paused') && (
          <TouchControls engine={engine} />
        )}
      </div>
      {fade > 0.005 && (
        <div className="fade-overlay" style={{ opacity: fade }} aria-hidden="true" />
      )}
      {phase === 'playing' && <LevelIntro />}
      <Epilogue />
      <NoteModal />
    </div>
  )
}
