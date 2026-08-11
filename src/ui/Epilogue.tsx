import { useGameStore } from '../state/gameStore'

/** Tela de encerramento após derrotar o chefe, antes da vitória. */
export function Epilogue() {
  const lines = useGameStore(state => state.epilogue)
  const dismiss = useGameStore(state => state.dismissEpilogue)

  if (!lines) return null

  return (
    <div className="narrative-overlay epilogue">
      <div className="narrative-lines">
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      <button className="menu-button" onClick={dismiss} autoFocus>
        Fim
      </button>
    </div>
  )
}
