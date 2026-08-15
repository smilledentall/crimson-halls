import campaignDoor from '../assets/sprites/doors/door-campaign.png'
import secretDoor from '../assets/sprites/doors/door-secret.png'

/** Imagens de porta (chroma key verde), selecionadas por campanha/secreta. */
export const DOOR_SPRITE_URLS = {
  campaign: campaignDoor,
  secret: secretDoor,
} as const

/** Todas as URLs de porta (pré-carregadas pela engine). */
export const ALL_DOOR_SPRITE_URLS: string[] = Object.values(DOOR_SPRITE_URLS)