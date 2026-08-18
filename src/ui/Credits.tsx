import { useGameStore } from '../state/gameStore'
import { EPILOGUE } from '../narrative/story.config'

interface CreditsSection {
  heading: string
  entries: string[]
}

/** Conteúdo dos créditos. Edite os nomes/roles conforme a equipe do projeto. */
const CREDITS: CreditsSection[] = [
  { heading: 'Desenvolvimento', entries: ['Crimson Halls'] },
  { heading: 'Programação', entries: ['TypeScript', 'Three.js', 'React', 'Zustand', 'Vite'] },
  { heading: 'Design de Níveis', entries: ['Grids', 'Portas', 'Secretos', 'Arenas de chefe'] },
  { heading: 'Arte', entries: ['Sprites', 'Texturas', 'Partículas'] },
  { heading: 'Áudio', entries: ['Efeitos procedurais'] },
  { heading: 'Agradecimentos', entries: ['Você, por jogar até o fim'] },
]

/** Tela de vitória da campanha: epílogo + créditos rolando em scroll. */
export function Credits() {
  const returnToMenu = useGameStore(state => state.returnToMenu)

  return (
    <div className="credits-screen">
      <div className="credits-track">
        <h1 className="credits-title">CRIMSON HALLS</h1>
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
