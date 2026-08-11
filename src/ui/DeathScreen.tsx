import { useGameStore } from '../state/gameStore'

export function DeathScreen() {
  const retryLevel = useGameStore(state => state.retryLevel)
  const returnToMenu = useGameStore(state => state.returnToMenu)

  return (
    <div className="menu screen death-screen">
      <h2 className="menu-title death-title">VOCÊ MORREU</h2>
      <button className="menu-button" onClick={retryLevel} autoFocus>
        Tentar Novamente
      </button>
      <button className="menu-button" onClick={returnToMenu}>
        Menu Principal
      </button>
    </div>
  )
}
