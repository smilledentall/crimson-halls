import { Enemy } from '../Enemy'
import type { CombatModifiers } from '../Enemy'
import { BossEnemy } from './BossEnemy'
import { RangedEnemy } from './RangedEnemy'
import { KamikazeEnemy } from './KamikazeEnemy'
import { TankEnemy } from './TankEnemy'
import { SwarmEnemy } from './SwarmEnemy'
import { ShieldedEnemy } from './ShieldedEnemy'
import { FlyingEnemy } from './FlyingEnemy'
import chaserSprite from '../../assets/sprites/Chaser.jpeg'
import rangedSprite from '../../assets/sprites/Ranged.jpeg'
import kamikazeSprite from '../../assets/sprites/Kamikaze.jpeg'
import tankSprite from '../../assets/sprites/Tanque.jpeg'
import bossSprite from '../../assets/sprites/Boss-Thane.jpeg'
import flyingSprite from '../../assets/sprites/flying.png'
import runnerSprite from '../../assets/sprites/runner.png'

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
  /** Escudo destrutível: absorve dano até ser quebrado (Shielded). */
  shield?: number
  /** Explosivo (kamikaze): explode ao tocar o jogador ou ao morrer. */
  explodesOnDeath?: boolean
  explosionRadius?: number
  explosionDamage?: number
  /** Escala do corpo em relação ao padrão. */
  meshScale?: number
  color?: number
  /** Núcleos ganhos ao abater este tipo. */
  reward: number
  /** URL do sprite billboard (fundo verde removido no carregamento). */
  sprite?: string
  /** Altura do sprite em unidades de mundo (padrão = 2.0 × meshScale). */
  spriteHeight?: number
}

/** URLs de todos os sprites de inimigo (pré-carregados pela engine). */
export const ENEMY_SPRITE_URLS: string[] = [
  chaserSprite,
  rangedSprite,
  kamikazeSprite,
  tankSprite,
  bossSprite,
  flyingSprite,
  runnerSprite,
]

export const ENEMY_TYPES: EnemyTypeDefinition[] = [
  {
    id: 'chaser',
    name: 'Perseguidor',
    health: 40,
    speed: 5,
    attackRange: 2,
    attackDamage: 10,
    attackInterval: 1.2,
    radius: 0.6,
    retreatRange: 0,
    ranged: false,
    reward: 3,
    sprite: runnerSprite,
    spriteHeight: 2.0,
  },
  {
    id: 'shooter',
    name: 'Atirador',
    health: 30,
    speed: 3.3,
    attackRange: 22,
    attackDamage: 8,
    attackInterval: 2,
    radius: 0.6,
    retreatRange: 8,
    ranged: true,
    reward: 4,
    sprite: rangedSprite,
    spriteHeight: 2.1,
  },
  {
    id: 'kamikaze',
    name: 'Kamikaze',
    health: 15,
    speed: 7,
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
    sprite: kamikazeSprite,
    spriteHeight: 1.6,
  },
  {
    id: 'tank',
    name: 'Tanque',
    health: 180,
    speed: 2,
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
    sprite: tankSprite,
    spriteHeight: 2.7,
  },
  {
    id: 'swarm',
    name: 'Enxame',
    health: 20,
    speed: 7,
    attackRange: 1.6,
    attackDamage: 8,
    attackInterval: 0.9,
    radius: 0.4,
    retreatRange: 0,
    ranged: false,
    meshScale: 0.5,
    color: 0x995544,
    reward: 2,
    sprite: chaserSprite,
    spriteHeight: 1.2,
  },
  {
    id: 'shielded',
    name: 'Escudo',
    health: 120,
    speed: 3,
    attackRange: 2,
    attackDamage: 15,
    attackInterval: 1.5,
    radius: 0.8,
    retreatRange: 0,
    ranged: false,
    armorMinDamage: 20,
    armorReduction: 0.5,
    shield: 60,
    meshScale: 1.2,
    color: 0x888888,
    reward: 8,
    sprite: chaserSprite,
    spriteHeight: 2.5,
  },
  {
    id: 'flying',
    name: 'Voador',
    health: 80,
    speed: 4,
    attackRange: 15,
    attackDamage: 12,
    attackInterval: 2.5,
    radius: 0.7,
    retreatRange: 0,
    ranged: true,
    meshScale: 1.0,
    color: 0x555555,
    reward: 5,
    sprite: flyingSprite,
    spriteHeight: 2.0,
  },
  {
    id: 'boss',
    name: 'O Thane de Crimson',
    health: 1200,
    speed: 2.8,
    attackRange: 3.5,
    attackDamage: 28,
    attackInterval: 2,
    radius: 1.3,
    retreatRange: 0,
    ranged: false,
    meshScale: 2.4,
    color: 0x6a2430,
    reward: 20,
    sprite: bossSprite,
    spriteHeight: 2.85,
  },
]

/** Instancia a classe certa conforme o tipo. */
export function createEnemy(
  type: EnemyTypeDefinition,
  x: number,
  z: number,
  healthMultiplier = 1,
  combat: CombatModifiers = {},
  floorId = '',
): Enemy {
  if (type.id === 'boss') return new BossEnemy(type, x, z, healthMultiplier, combat, floorId)
  if (type.id === 'kamikaze') return new KamikazeEnemy(type, x, z, healthMultiplier, combat, floorId)
  if (type.id === 'tank') return new TankEnemy(type, x, z, healthMultiplier, combat, floorId)
  if (type.id === 'swarm') return new SwarmEnemy(type, x, z, healthMultiplier, combat, floorId)
  if (type.id === 'shielded') return new ShieldedEnemy(type, x, z, healthMultiplier, combat, floorId)
  if (type.id === 'flying') return new FlyingEnemy(type, x, z, healthMultiplier, combat, floorId)
  if (type.ranged) return new RangedEnemy(type, x, z, healthMultiplier, combat, floorId)
  return new Enemy(type, x, z, healthMultiplier, combat, floorId)
}
