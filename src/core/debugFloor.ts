/** Nível isolado de teste multi-andar — o ÚNICO lugar onde o atalho F de
 *  debug (trocar de andar) pode agir. Fora dele, F não faz nada. */
export const DEBUG_MULTIFLOOR_LEVEL_ID = 'level-multifloor-test'

/**
 * Libera ou não a troca de andar pela tecla F (debug).
 *
 * Regra estrita: F só age no nível isolado de teste multi-andar E quando o
 * nível carregado tem mais de 1 andar. Qualquer outro nível — campanha normal
 * (andar único, `floorCount = 0`), níveis customizados multi-andar, etc. —
 * nunca dispara, evitando `setCurrentFloor()` para um andar inexistente.
 */
export function canDebugFloorSwitch(levelId: string, floorCount: number): boolean {
  return levelId === DEBUG_MULTIFLOOR_LEVEL_ID && floorCount > 1
}