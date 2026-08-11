import { Enemy } from '../Enemy'
import { BossEnemy } from './BossEnemy'
import { RangedEnemy } from './RangedEnemy'
import { KamikazeEnemy } from './KamikazeEnemy'
import { TankEnemy } from './TankEnemy'

/**
 * Catálogo de variações de inimigo. Cada tipo é um conjunto de dados;
 * a classe Enemy (core) consome esses valores. Novos tipos entram aqui
 * sem alterar a IA.
 */
export interface EnemyTypeDefinition {
  id: string
  name: string
  health: number
  speed: number
  attackRange: number
  attackDamage: number
  attackInterval: number
  radius: number
  /** Distância mínima mantida por inimigos à distância (0 = nunca recua). */
  retreatRange: number
  ranged: boolean
  /** Blindagem: reduz dano de armas com dano abaixo de armorMinDamage. */
  armorMinDamage?: number
  armorReduction?: number
  /** Explosivo (kamikaze): explode ao tocar o jogador ou ao morrer. */
  explodesOnDeath?: boolean
  explosionRadius?: number
  explosionDamage?: number
  /** Escala do corpo em relação ao padrão. */
  meshScale?: number
  color?: number
  /** Núcleos ganhos ao abater este tipo. */
  reward: number
}

export const ENEMY_TYPES: EnemyTypeDefinition[] = [
  {
    id: 'chaser',
    name: 'Perseguidor',
    health: 40,
    speed: 3.8,
    attackRange: 2,
    attackDamage: 10,
    attackInterval: 1.2,
    radius: 0.6,
    retreatRange: 0,
    ranged: false,
    reward: 3,
  },
  {
    id: 'shooter',
    name: 'Atirador',
    health: 30,
    speed: 2.6,
    attackRange: 22,
    attackDamage: 8,
    attackInterval: 2,
    radius: 0.6,
    retreatRange: 8,
    ranged: true,
    reward: 4,
  },
  {
    id: 'kamikaze',
    name: 'Kamikaze',
    health: 15,
    speed: 5.5,
    attackRange: 1.8,
    attackDamage: 25,
    attackInterval: 9999,
    radius: 0.5,
    retreatRange: 0,
    ranged: false,
    explodesOnDeath: true,
    explosionRadius: 3,
    explosionDamage: 25,
    meshScale: 0.75,
    color: 0xd4344a,
    reward: 2,
  },
  {
    id: 'tank',
    name: 'Tanque',
    health: 180,
    speed: 1.5,
    attackRange: 1.8,
    attackDamage: 20,
    attackInterval: 1.4,
    radius: 0.9,
    retreatRange: 0,
    ranged: false,
    armorMinDamage: 25,
    armorReduction: 0.25,
    meshScale: 1.5,
    color: 0x4a4a52,
    reward: 6,
  },
  {
    id: 'boss',
    name: 'O Thane de Crimson',
    health: 1200,
    speed: 2.2,
    attackRange: 3.5,
    attackDamage: 28,
    attackInterval: 2,
    radius: 1.3,
    retreatRange: 0,
    ranged: false,
    meshScale: 2.4,
    color: 0x6a2430,
    reward: 20,
  },
]

/** Instancia a classe certa conforme o tipo. */
export function createEnemy(
  type: EnemyTypeDefinition,
  x: number,
  z: number,
  healthMultiplier = 1,
): Enemy {
  if (type.id === 'boss') return new BossEnemy(type, x, z, healthMultiplier)
  if (type.id === 'kamikaze') return new KamikazeEnemy(type, x, z, healthMultiplier)
  if (type.id === 'tank') return new TankEnemy(type, x, z, healthMultiplier)
  if (type.ranged) return new RangedEnemy(type, x, z, healthMultiplier)
  return new Enemy(type, x, z, healthMultiplier)
}
