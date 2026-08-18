import { useGameStore } from '../state/gameStore'
import { EPILOGUE } from '../narrative/story.config'

interface CreditsSection {
  heading: string
  entries: string[]
}

/** Conteúdo dos créditos. Edite os nomes/roles conforme a equipe do projeto. */
const CREDITS: CreditsSection[] = [
  { heading: 'CRIAÇÃO E DIREÇÃO', entries: ['ProgramaDinho'] },
  { heading: 'DESIGN DE JOGO', entries: ['Sistema de combate, progressão e balanceamento', 'ProgramaDinho'] },
  { heading: 'PROGRAMAÇÃO', entries: ['Engine, física, inteligência artificial dos inimigos', 'ProgramaDinho'] },
  { heading: 'DESIGN DE NÍVEIS', entries: ['15 fases de puro caos', 'Editor de níveis integrado', 'ProgramaDinho'] },
  { heading: 'ARMAS E COMBATE', entries: ['5 armas forjadas para a batalha', 'Sistema de upgrades e progressão', 'ProgramaDinho'] },
  { heading: 'INIMIGOS', entries: ['5 tipos de criaturas, cada uma com sua própria fúria', 'Chasers · Atiradores · Kamikazes · Tanques · Voadores', 'ProgramaDinho'] },
  { heading: 'ÁUDIO', entries: ['Trilha sonora e efeitos sonoros', 'ProgramaDinho'] },
  { heading: 'TECNOLOGIAS UTILIZADAS', entries: ['Three.js — Motor de renderização 3D', 'React — Interface e menus', 'Zustand — Gerenciamento de estado', 'Vite — Build e desenvolvimento'] },
  { heading: 'UM AGRADECIMENTO A VOCÊ, JOGADOR', entries: ['Você enfrentou cada corredor sombrio,', 'cada inimigo que ousou te desafiar,', 'e chegou até o fim.', 'Crimson Lead não existe sem quem joga.', 'Obrigado por essa jornada.'] },
  { heading: '© 2026 ProgramaDinho', entries: ['Feito com sangue, café e muitas linhas de código'] },
]

/** Tela de vitória da campanha: epílogo + créditos rolando em scroll. */
export function Credits() {
  const returnToMenu = useGameStore(state => state.returnToMenu)

  return (
    <div className="credits-screen">
      <div className="credits-track">
        <h1 className="credits-title">CRIMSON LEAD</h1>
        <p className="credits-subtitle">Os Corredores de Crimson Lead</p>

        <div className="credits-epilogue">
          {EPILOGUE.map(line => (
            <p key={line}>{line}</p>
          ))}
        </div>

        {CREDITS.map(section => (
          <div className="credits-section" key={section.heading}>
            <h2 className="credits-heading">{section.heading}</h2>
            {section.entries.map(entry => (
              <p className="credits-entry" key={entry}>
                {entry}
              </p>
            ))}
          </div>
        ))}

        <p className="credits-thanks">Obrigado por jogar!</p>
      </div>

      <button className="menu-button credits-skip" onClick={returnToMenu}>
        Pular &mdash; Menu Principal
      </button>
    </div>
  )
}
