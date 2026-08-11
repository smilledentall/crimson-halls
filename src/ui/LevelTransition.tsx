import { useGameStore } from '../state/gameStore'

/**
 * Tela de vitória (final da campanha) e fim de nível customizado.
 * O avanço entre níveis agora é feito apenas pelas portas (tecla G);
 * limpar inimigos não avança — só destrava as portas do setor.
 */
export function LevelTransition() {
  const returnToMenu = useGameStore(state => state.returnToMenu)
  const isCustomLevel = useGameStore(state => state.customLevel !== null)

  return (
    <div className="menu screen">
      <h2 className="menu-title">VITÓRIA</h2>
      <p className="game-subtitle">
        {isCustomLevel
          ? 'Nível customizado concluído. Ele pode ser exportado para uso posterior.'
          : 'Você escapou dos corredores de Crimson Halls.'}
      </p>
      <button className="menu-button" onClick={returnToMenu} autoFocus>
        Menu Principal
      </button>
    </div>
  )
}
