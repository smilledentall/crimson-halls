import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'

/**
 * Abertura de nível: título + frases em estilo "diário/transmissão".
 * Reaproveita o screenFade; dispensável por clique ou qualquer tecla.
 */
export function LevelIntro() {
  const intro = useGameStore(state => state.levelIntro)
  const dismiss = useGameStore(state => state.dismissLevelIntro)

  useEffect(() => {
    if (!intro) return
    const onKey = () => dismiss()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [intro, dismiss])

  if (!intro) return null

  return (
    <div className="narrative-overlay" onClick={dismiss}>
      <h2 className="narrative-title">{intro.title}</h2>
      <div className="narrative-lines">
        {intro.lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      <span className="narrative-hint">Clique ou pressione qualquer tecla</span>
    </div>
  )
}
