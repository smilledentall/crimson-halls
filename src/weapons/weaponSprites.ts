import type { WeaponId } from './weapons.config'
import pistolaSprite from '../assets/sprites/weapons/pistola.png'
import shotgunSprite from '../assets/sprites/weapons/shotgun.png'
import rifleSprite from '../assets/sprites/weapons/rifle.png'
import fogueteSprite from '../assets/sprites/weapons/lançador_de_foguetes.png'
import motosserraSprite from '../assets/sprites/weapons/motosserra.png'

/** URL da imagem (viewmodel em primeira pessoa) de cada arma. */
export const WEAPON_SPRITE_URLS: Record<WeaponId, string> = {
  pistol: pistolaSprite,
  shotgun: shotgunSprite,
  rifle: rifleSprite,
  rocket: fogueteSprite,
  chainsaw: motosserraSprite,
}

/** Todas as URLs de sprites de arma (pré-carregadas pela engine). */
export const ALL_WEAPON_SPRITE_URLS: string[] = Object.values(WEAPON_SPRITE_URLS)
