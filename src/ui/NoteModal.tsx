import { useGameStore } from '../state/gameStore'

/** Modal de nota de lore encontrada (sala secreta). */
export function NoteModal() {
  const text = useGameStore(state => state.noteModal)
  const close = useGameStore(state => state.setNoteModal)

  if (!text) return null

  return (
    <div className="note-modal" onClick={() => close(null)}>
      <div className="note-card" onClick={event => event.stopPropagation()}>
        <p className="note-text">{text}</p>
        <button className="menu-button" onClick={() => close(null)} autoFocus>
          Fechar
        </button>
      </div>
    </div>
  )
}
