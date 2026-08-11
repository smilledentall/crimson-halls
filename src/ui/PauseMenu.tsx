import { useState } from 'react'
import { useGameStore } from '../state/gameStore'

export function PauseMenu() {
  const resume = useGameStore(state => state.resume)
  const returnToMenu = useGameStore(state => state.returnToMenu)
  const resetProgress = useGameStore(state => state.resetProgress)
  const openSettings = useGameStore(state => state.openSettings)
  const openUpgrade = useGameStore(state => state.openUpgrade)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleResetClick = () => {
    if (confirmReset) {
      setConfirmReset(false)
      resetProgress()
    } else {
      setConfirmReset(true)
    }
  }

  return (
    <div className="menu screen">
      <h2 className="menu-title">PAUSADO</h2>
      <button className="menu-button" onClick={resume} autoFocus>
        Continuar
      </button>
      <button className="menu-button" onClick={openSettings}>
        Configurações
      </button>
      <button className="menu-button" onClick={openUpgrade}>
        Melhorias
      </button>
      <button className="menu-button" onClick={returnToMenu}>
        Menu Principal
      </button>
      <button className="menu-button danger" onClick={handleResetClick}>
        {confirmReset ? 'Confirmar apagar progresso?' : 'Reiniciar progresso'}
      </button>
    </div>
  )
}
