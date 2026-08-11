import { useGameStore } from '../state/gameStore'
import { hasSave } from '../state/saveSystem'
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../state/difficulty.config'

export function MainMenu() {
  const startGame = useGameStore(state => state.startGame)
  const continueGame = useGameStore(state => state.continueGame)
  const setPhase = useGameStore(state => state.setPhase)
  const openSettings = useGameStore(state => state.openSettings)
  const openUpgrade = useGameStore(state => state.openUpgrade)
  const difficulty = useGameStore(state => state.difficulty)
  const setDifficulty = useGameStore(state => state.setDifficulty)
  const hasProgress = hasSave()

  return (
    <div className="menu screen">
      <h1 className="game-title">CRIMSON HALLS</h1>
      <p className="game-subtitle">Você está preso nos corredores de Crimson.</p>

      {hasProgress && (
        <button className="menu-button" onClick={continueGame} autoFocus>
          Continuar
        </button>
      )}
      <button className="menu-button" onClick={startGame}>
        Novo Jogo
      </button>
      <button className="menu-button" onClick={openSettings}>
        Configurações
      </button>
      <button className="menu-button" onClick={openUpgrade}>
        Melhorias
      </button>
      <button className="menu-button" onClick={() => setPhase('editor')}>
        Editor de Níveis
      </button>

      <div className="difficulty-select">
        <span className="difficulty-label">Dificuldade</span>
        <div className="difficulty-options">
          {DIFFICULTY_ORDER.map(id => (
            <button
              key={id}
              className={`difficulty-button${difficulty === id ? ' active' : ''}`}
              onClick={() => setDifficulty(id)}
            >
              {DIFFICULTIES[id].name}
            </button>
          ))}
        </div>
        <p className="difficulty-desc">{DIFFICULTIES[difficulty].description}</p>
      </div>

      <div className="controls-hint">
        <p>EAXF — mover &nbsp;·&nbsp; Mouse — olhar &nbsp;·&nbsp; Shift — correr</p>
        <p>G — interagir (portas) &nbsp;·&nbsp; P — pausar</p>
      </div>
    </div>
  )
}
