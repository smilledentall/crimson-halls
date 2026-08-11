export type WeaponId = 'pistol' | 'shotgun' | 'rifle' | 'rocket' | 'chainsaw'

export type WeaponKind = 'hitscan' | 'projectile' | 'melee'

export interface WeaponDefinition {
  id: WeaponId
  name: string
  /** Nome curto para o slot do HUD. */
  shortName: string
  kind: WeaponKind
  damage: number
  /** Disparos por segundo. */
  fireRate: number
  /** Dispersão máxima do tiro, em radianos. */
  spread: number
  /** Número de projéteis por disparo (escopeta atira vários). */
  pellets: number
  /** Alcance em metros. 0 = ilimitado. */
  range: number
  /** Capacidade de munição. 0 = munição infinita (pistola/motosserra). */
  ammoCapacity: number
  /** Disparo contínuo enquanto segura o botão. */
  automatic: boolean
  /** Raio da explosão (armas de área). */
  splashRadius?: number
  /** Velocidade do projétil, em m/s (lançador). */
  projectileSpeed?: number
}

/**
 * Balanceamento das armas — dados declarativos, fora da lógica de tiro.
 * Novas armas entram aqui e no WEAPON_ORDER, sem tocar o core.
 */
export const WEAPONS: Record<WeaponId, WeaponDefinition> = {
  pistol: {
    id: 'pistol',
    name: 'Pistola',
    shortName: 'PIST',
    kind: 'hitscan',
    damage: 20,
    fireRate: 4,
    spread: 0.02,
    pellets: 1,
    range: 120,
    ammoCapacity: 0,
    automatic: false,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Escopeta',
    shortName: 'SHOT',
    kind: 'hitscan',
    damage: 10,
    fireRate: 1.3,
    spread: 0.14,
    pellets: 8,
    range: 50,
    ammoCapacity: 8,
    automatic: false,
  },
  rifle: {
    id: 'rifle',
    name: 'Rifle Automático',
    shortName: 'RIFL',
    kind: 'hitscan',
    damage: 14,
    fireRate: 10,
    spread: 0.05,
    pellets: 1,
    range: 150,
    ammoCapacity: 60,
    automatic: true,
  },
  rocket: {
    id: 'rocket',
    name: 'Lançador de Foguetes',
    shortName: 'RKT',
    kind: 'projectile',
    damage: 60,
    fireRate: 0.8,
    spread: 0.01,
    pellets: 1,
    range: 200,
    ammoCapacity: 6,
    automatic: false,
    splashRadius: 4.5,
    projectileSpeed: 16,
  },
  chainsaw: {
    id: 'chainsaw',
    name: 'Motosserra',
    shortName: 'CHAIN',
    kind: 'melee',
    damage: 30,
    fireRate: 10,
    spread: 0,
    pellets: 1,
    range: 2.4,
    ammoCapacity: 0,
    automatic: true,
  },
}

/** Ordem de troca de arma (teclas 1..n). */
export const WEAPON_ORDER: WeaponId[] = ['pistol', 'shotgun', 'rifle', 'rocket', 'chainsaw']
